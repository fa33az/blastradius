import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyGraph, ImportEdge, ImportType, ModuleNode } from './types';

export class GraphBuilder {
  private project: Project;
  private rootPath: string;
  private customEntry?: string;

  constructor(rootPath: string, customEntry?: string) {
    this.rootPath = path.resolve(rootPath);
    this.customEntry = customEntry ? path.resolve(customEntry) : undefined;
    
    // Find tsconfig if present, otherwise default setup
    const tsConfigPath = path.join(this.rootPath, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      this.project = new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: false,
      });
    } else {
      this.project = new Project({
        compilerOptions: {
          allowJs: true,
        },
      });
      // Add all ts, tsx, js, jsx files under rootPath excluding node_modules/dist
      this.project.addSourceFilesAtPaths([
        path.join(this.rootPath, '**/*.{ts,tsx,js,jsx}'),
        `!${path.join(this.rootPath, 'node_modules/**')}`,
        `!${path.join(this.rootPath, 'dist/**')}`,
        `!${path.join(this.rootPath, 'build/**')}`,
        `!${path.join(this.rootPath, '.git/**')}`,
      ]);
    }
  }

  public buildGraph(): DependencyGraph {
    const nodes = new Map<string, ModuleNode>();
    const sourceFiles = this.project.getSourceFiles();

    // 1. Initialize nodes for all source files
    for (const sourceFile of sourceFiles) {
      const filePath = path.resolve(sourceFile.getFilePath());
      // Skip node_modules or build outputs if tsconfig loaded them
      const lowerPath = filePath.toLowerCase().replace(/\\/g, '/');
      if (lowerPath.includes('/node_modules/') || lowerPath.includes('/dist/')) {
        continue;
      }

      const relPath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
      nodes.set(filePath, {
        absolutePath: filePath,
        relativePath: relPath,
        isEntrypoint: this.checkIsEntrypoint(filePath, relPath),
        isCoreLayer: this.checkIsCoreLayer(relPath),
        isConfig: this.checkIsConfig(relPath),
        isLegacy: this.checkIsLegacy(relPath),
        importedModules: [],
        dependentModules: [],
      });
    }

    // 2. Parse import and export declarations for each source file
    for (const sourceFile of sourceFiles) {
      const sourcePath = path.resolve(sourceFile.getFilePath());
      const sourceNode = nodes.get(sourcePath);
      if (!sourceNode) continue;

      // Handle Static Imports
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        const isTypeOnly = importDecl.isTypeOnly();
        const specifiers = importDecl.getNamedImports().map(ni => ni.getName());
        if (importDecl.getDefaultImport()) {
          specifiers.push('default');
        }

        const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
        if (resolvedSourceFile) {
          const targetPath = path.resolve(resolvedSourceFile.getFilePath());
          const targetNode = nodes.get(targetPath);

          if (targetNode) {
            const importType: ImportType = isTypeOnly ? 'type-only' : 'static';
            this.addDependency(sourceNode, targetNode, importType, specifiers);
          }
        }
      }

      // Handle Export Declarations with module specifiers (e.g., export * from './foo')
      const exportDeclarations = sourceFile.getExportDeclarations();
      for (const exportDecl of exportDeclarations) {
        const resolvedSourceFile = exportDecl.getModuleSpecifierSourceFile();
        if (resolvedSourceFile) {
          const targetPath = path.resolve(resolvedSourceFile.getFilePath());
          const targetNode = nodes.get(targetPath);
          if (targetNode) {
            const isTypeOnly = exportDecl.isTypeOnly();
            const specifiers = exportDecl.getNamedExports().map(ne => ne.getName());
            const importType: ImportType = isTypeOnly ? 'type-only' : 'static';
            this.addDependency(sourceNode, targetNode, importType, specifiers.length ? specifiers : ['*']);
          }
        }
      }

      // Handle Dynamic Imports (import(...) or require(...))
      const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const callExpr of callExpressions) {
        const expression = callExpr.getExpression();
        const text = expression.getText();

        if (text === 'import' || text === 'require') {
          const args = callExpr.getArguments();
          if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
            const moduleSpecifier = args[0].getText().replace(/['"]/g, '');
            // Try resolving relative path if string literal
            const targetPath = this.resolveRelativeModule(sourcePath, moduleSpecifier, nodes);
            if (targetPath && nodes.has(targetPath)) {
              const targetNode = nodes.get(targetPath)!;
              this.addDependency(sourceNode, targetNode, 'dynamic', ['dynamic']);
            }
          }
        }
      }
    }

    return {
      nodes,
      rootPath: this.rootPath,
      totalFiles: nodes.size,
    };
  }

  private addDependency(sourceNode: ModuleNode, targetNode: ModuleNode, type: ImportType, specifiers: string[]) {
    if (!sourceNode.importedModules.includes(targetNode.absolutePath)) {
      sourceNode.importedModules.push(targetNode.absolutePath);
    }

    const existingEdge = targetNode.dependentModules.find(
      edge => edge.sourcePath === sourceNode.absolutePath && edge.type === type
    );

    if (existingEdge) {
      existingEdge.specifiers = Array.from(new Set([...existingEdge.specifiers, ...specifiers]));
    } else {
      const edge: ImportEdge = {
        sourcePath: sourceNode.absolutePath,
        targetPath: targetNode.absolutePath,
        type,
        specifiers,
      };
      targetNode.dependentModules.push(edge);
    }
  }

  private resolveRelativeModule(sourcePath: string, specifier: string, nodes: Map<string, ModuleNode>): string | null {
    if (!specifier.startsWith('.')) return null;
    const dir = path.dirname(sourcePath);
    const candidateBase = path.resolve(dir, specifier);

    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.tsx', '/index.jsx'];
    for (const ext of extensions) {
      const full = candidateBase + ext;
      if (nodes.has(full)) {
        return full;
      }
    }
    return null;
  }

  private checkIsEntrypoint(filePath: string, relPath: string): boolean {
    if (this.customEntry && filePath === this.customEntry) return true;
    const lower = relPath.toLowerCase();
    return (
      lower === 'src/index.ts' ||
      lower === 'src/index.js' ||
      lower === 'src/main.ts' ||
      lower === 'src/main.js' ||
      lower === 'src/app.ts' ||
      lower === 'src/server.ts' ||
      lower.startsWith('bin/')
    );
  }

  private checkIsCoreLayer(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('/core/') ||
      lower.includes('/app/') ||
      lower.includes('/kernel/') ||
      lower.includes('/engine/') ||
      lower.includes('/services/')
    );
  }

  private checkIsConfig(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('config') ||
      lower.includes('bootstrap') ||
      lower.includes('setup') ||
      lower.includes('init')
    );
  }

  private checkIsLegacy(relPath: string): boolean {
    const lower = relPath.toLowerCase();
    return (
      lower.includes('legacy') ||
      lower.includes('deprecated') ||
      lower.includes('archive') ||
      lower.includes('old')
    );
  }
}
