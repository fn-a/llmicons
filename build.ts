import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import {
    SVG,
    importDirectory,
    cleanupSVG,
    runSVGO,
    parseColors,
    isEmptyColor,
    scaleSVG,
    IconSet,
} from '@iconify/tools';
import type { IconifyJSON, IconifyInfo, IconifyIcons } from '@iconify/types';

// ── 路径常量 ──────────────────────────────────────────────
const ROOT = dirname(fileURLToPath(import.meta.url));

/** 读取 JSON 文件，不存在则返回 null */
function readJSON<T>(filePath: string): T | null {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

// ── 配置类型 ──────────────────────────────────────────────

interface CollectionConfig {
    /** 图标集前缀，如 'lobe' / 'mdev' */
    prefix: string;
    /** SVG 源目录（相对于项目根） */
    sourceDir: string;
    /** 输出目录（相对于项目根） */
    outputDir: string;
    /**
     * 源目录结构类型：
     * - 'flat': 扁平目录，每个 .svg 文件名即为图标名（lobe-icons）
     * - 'nested': 嵌套目录，每个子目录名即为图标名，子目录下的 .svg 为图标文件（models.dev）
     */
    layout: 'flat' | 'nested';
    /**
     * iconSetVersion 来源：
     * - 若为字符串路径，则从该 package.json 读取 version 字段（如 lobe-icons）
     * - 若为 null，则与输出包的 version 保持一致（如 models.dev）
     */
    iconSetVersionSource: string | null;
    /** info.json 内容（不含 prefix / total / version，这些由脚本自动填充） */
    info: Omit<IconifyInfo, 'prefix' | 'total' | 'version'>;
    /** package.json 中的 name 字段 */
    packageName: string;
    /** package.json 中的 description 字段 */
    packageDescription: string;
}

// ── 各图标集配置 ──────────────────────────────────────────
const COLLECTIONS: Record<string, CollectionConfig> = {
    lobe: {
        prefix: 'lobe',
        sourceDir: join(ROOT, 'repos', 'lobe-icons', 'packages', 'static-svg', 'icons'),
        outputDir: join(ROOT, 'icons', 'lobe'),
        layout: 'flat',
        // lobe-icons 上游有独立版本号
        iconSetVersionSource: join(
            ROOT,
            'repos',
            'lobe-icons',
            'packages',
            'static-svg',
            'package.json',
        ),
        info: {
            name: 'Lobe Icons',
            author: {
                name: 'Lobehub Icons',
                url: 'https://github.com/lobehub/lobe-icons',
            },
            license: {
                title: 'MIT',
                spdx: 'MIT',
                url: 'https://github.com/lobehub/lobe-icons/blob/master/LICENSE',
            },
            samples: ['openai', 'google-color', 'deepseek', 'qwen', 'anthropic'],
            height: 24,
            category: 'Logos',
            tags: ['LLM Brands', 'Model Logo', 'Model Icon', 'AI Brand', 'AI Icons'],
            palette: false,
        },
        packageName: '@llmicons-json/lobe',
        packageDescription: 'Lobehub Icons icon set in Iconify JSON format',
    },
    mdev: {
        prefix: 'mdev',
        sourceDir: join(ROOT, 'repos', 'models.dev', 'providers'),
        outputDir: join(ROOT, 'icons', 'mdev'),
        layout: 'nested',
        // models.dev 无独立版本号，与输出包版本一致
        iconSetVersionSource: null,
        info: {
            name: 'Models.dev Icons',
            author: {
                name: 'Models.dev Icons',
                url: 'https://github.com/anomalyco/models.dev',
            },
            license: {
                title: 'MIT',
                spdx: 'MIT',
                url: 'https://github.com/anomalyco/models.dev/blob/dev/LICENSE',
            },
            samples: ['deepseek', 'openai', 'google-vertex', 'anthropic', 'alibaba'],
            height: 24,
            category: 'Logos',
            tags: ['LLM Brands', 'Model Logo', 'Model Icon', 'AI Brand', 'AI Icons'],
            palette: false,
        },
        packageName: '@llmicons-json/mdev',
        packageDescription: 'Models.dev icon set in Iconify JSON format',
    },
};

// ── 工具函数 ──────────────────────────────────────────────

function ensureDir(dir: string): void {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

function writeJSON(filePath: string, data: unknown): void {
    writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

function generateIndexJS(outputDir: string): void {
    const content = [
        "const icons = require('./icons.json');",
        "const info = require('./info.json');",
        'const metadata = {};',
        'const chars = {};',
        '',
        'exports.icons = icons;',
        'exports.info = info;',
        'exports.metadata = metadata;',
        'exports.chars = chars;',
        '',
    ].join('\n');
    writeFileSync(join(outputDir, 'index.js'), content, 'utf8');
}

function generateIndexMJS(outputDir: string): void {
    const content = [
        "import icons from './icons.json' with { type: 'json' };",
        "import info from './info.json' with { type: 'json' };",
        '',
        'const metadata = {};',
        'const chars = {};',
        'export { icons, info, metadata, chars };',
        '',
    ].join('\n');
    writeFileSync(join(outputDir, 'index.mjs'), content, 'utf8');
}

function generateIndexDTS(outputDir: string): void {
    const content = [
        "import type { IconifyJSON, IconifyInfo, IconifyMetaData, IconifyChars } from '@iconify/types';",
        '',
        'export { IconifyJSON, IconifyInfo, IconifyMetaData, IconifyChars };',
        '',
        'export declare const icons: IconifyJSON;',
        'export declare const info: IconifyInfo;',
        'export declare const metadata: IconifyMetaData;',
        'export declare const chars: IconifyChars;',
        '',
    ].join('\n');
    writeFileSync(join(outputDir, 'index.d.ts'), content, 'utf8');
}

/** 生成 package.json，支持版本号动态计算 */
function generatePackageJSON(
    outputDir: string,
    config: CollectionConfig,
    version: string,
    iconSetVersion: string,
): void {
    const pkg = {
        name: config.packageName,
        description: config.packageDescription,
        version,
        iconSetVersion,
        main: 'index.js',
        module: 'index.mjs',
        types: 'index.d.ts',
        homepage: 'https://github.com/fn-a/llmicons',
        bugs: 'https://github.com/fn-a/llmicons/issues',
        license: 'MIT',
        exports: {
            './*': './*',
            '.': {
                types: './index.d.ts',
                require: './index.js',
                import: './index.mjs',
            },
            './icons.json': './icons.json',
            './info.json': './info.json',
        },
        iconSet: {
            icons: 'icons.json',
            info: 'info.json',
        },
        dependencies: {
            '@iconify/types': '*',
        },
    };
    writeJSON(join(outputDir, 'package.json'), pkg);
}

// ── 图标优化 ──────────────────────────────────────

/**
 * 对 IconSet 中所有图标执行优化流水线：
 * 1. 检测是否含实色 → 若无 -color 变体则自动生成
 * 2. 统一颜色为 currentColor（inherit 也转 currentColor）
 * 3. runSVGO 优化
 */
function optimizeIconSet(iconSet: IconSet, config: CollectionConfig): { colored: number; removed: number } {
    let colored = 0;
    let removed = 0;

    iconSet.forEach((name, type) => {
        if (type !== 'icon') return;

        const svg = iconSet.toSVG(name);
        if (!svg) {
            iconSet.remove(name);
            removed++;
            return;
        }

        try {
            // // 检测图标是否含有实色（非 currentColor / inherit / 空）
            // let hasSolidColor = false;
            // const probeSvg = new SVG(svg.toString());
            // parseColors(probeSvg, {
            //     callback: (_attr, _colorStr, color) => {
            //         if (
            //             color &&
            //             !isEmptyColor(color) &&
            //             _colorStr !== 'currentColor' &&
            //             _colorStr !== 'inherit'
            //         ) {
            //             hasSolidColor = true;
            //         }
            //         return _colorStr; // 仅探测，不修改
            //     },
            // });

            // // 有实色、尚无 -color 变体、且自身不是 -color 变体 → 生成一份保留原始颜色的副本
            // if (hasSolidColor && !iconSet.exists(`${name}-color`) && !name.endsWith('-color')) {
            //     const colorSvg = new SVG(svg.toString());
            //     parseColors(colorSvg, {
            //         callback: (_attr, _colorStr, color) => {
            //             // inherit 转 currentColor，其余保留原始颜色
            //             if (_colorStr === 'inherit') return 'currentColor';
            //             return _colorStr;
            //         },
            //     });
            //     runSVGO(colorSvg);
            //     iconSet.fromSVG(`${name}-color`, colorSvg);
            // }
            // if (!name.endsWith('-color')) {
            //     // 原图标统一转为 currentColor
            //     parseColors(svg, {
            //         defaultColor: 'currentColor',
            //         callback: (_attr, _colorStr, color) => {
            //             return !color || isEmptyColor(color) ? _colorStr : 'currentColor';
            //         },
            //     });
            // }

            runSVGO(svg);
        } catch (err) {
            console.warn(`   ⚠ Failed to parse: ${name}`, err instanceof Error ? err.message : err);
            iconSet.remove(name);
            removed++;
            return;
        }

        iconSet.fromSVG(name, svg);
        colored++;
    });

    return { colored, removed };
}

// ── 导入策略 ──────────────────────────────────────────────

/** 扁平目录导入：文件名即图标名 */
async function importFlat(sourceDir: string, prefix: string): Promise<[IconSet, Record<string, string>]> {
    const iconSet = await importDirectory(sourceDir, {
        prefix,
        ignoreImportErrors: 'warn',
    });
    return [iconSet, {}];
}

/** 嵌套目录导入：子目录名即图标名，子目录下的 .svg 为图标文件 */
function importNested(sourceDir: string, prefix: string): [IconSet, Record<string, string>] {
    if (!existsSync(sourceDir)) {
        throw new Error(`Source directory not found: ${sourceDir}`);
    }

    const entries = readdirSync(sourceDir, { withFileTypes: true });
    const icons: IconifyIcons = {};
    const unnormals: Record<string, string> = {};

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const providerDir = join(sourceDir, entry.name);
        const files = readdirSync(providerDir, { withFileTypes: true });

        // 找到第一个 .svg 文件
        const svgFile = files.find((f) => f.isFile() && extname(f.name).toLowerCase() === '.svg');
        if (!svgFile) {
            console.warn(`   ⚠ Skipping (no SVG): ${entry.name}`);
            continue;
        }

        const svgPath = join(providerDir, svgFile.name);
        const iconName = entry.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        let svgContent = '';
        let svgInstance: SVG | undefined = undefined;
        try {
            svgContent = readFileSync(svgPath, 'utf8');
            svgInstance = new SVG(svgContent);
            // 必须先执行一次清理
            cleanupSVG(svgInstance);
            icons[iconName] = svgInstance.getIcon();
        } catch (err) {
            console.warn(
                `   ⚠ Failed to read: ${svgPath}`,
                err instanceof Error ? err.message : err,
            );
            if (svgInstance && svgContent) {
                unnormals[iconName] = svgContent;
            }
        }
    }

    return [new IconSet({ prefix, icons }), unnormals];
}

// ── 版本解析 ──────────────────────────────────────────────

/** 计算 iconSetVersion */
function resolveIconSetVersion(config: CollectionConfig): string {
    if (config.iconSetVersionSource) {
        const upstreamPkg = readJSON<{ version: string }>(config.iconSetVersionSource);
        if (!upstreamPkg?.version) {
            throw new Error(`Failed to read version from ${config.iconSetVersionSource}`);
        }
        return upstreamPkg.version;
    }
    // 无上游版本源时，与输出包 version 一致（后续由 resolveVersion 填充）
    return '';
}

/** 计算输出包 version：读取现有 package.json；若无现有则用 '1.0.0' */
function resolveVersion(outputDir: string): string {
    const existingPkg = readJSON<{ version: string }>(join(outputDir, 'package.json'));
    const current = existingPkg?.version ?? '1.0.0';
    return current;
}

// ── 核心：处理单个图标集 ──────────────────────────────────

async function buildCollection(
    config: CollectionConfig,
): Promise<void> {
    const { prefix, sourceDir, outputDir, layout, info: infoBase } = config;

    console.log(`\n📦 Building icon set: ${prefix}`);
    console.log(`   Source: ${sourceDir}`);
    console.log(`   Output: ${outputDir}`);
    console.log(`   Layout: ${layout}`);

    // 计算版本号
    const version = resolveVersion(outputDir);
    const iconSetVersion = config.iconSetVersionSource ? resolveIconSetVersion(config) : version;

    console.log(`   Version: ${version}`);

    console.log(`   Icon set version: ${iconSetVersion}`);

    // 1. 导入 SVG
    console.log('   → Importing SVG files...');
    const [iconSet, unnormals] =
        layout === 'flat' ? await importFlat(sourceDir, prefix) : importNested(sourceDir, prefix);

    // 2. 优化
    console.log('   → Optimizing SVG icons...');
    const { colored, removed } = optimizeIconSet(iconSet, config);
    console.log(`   ✓ Optimimized: colored ${colored} icons, removed: ${removed} icons`);

    // 3. 导出 IconifyJSON
    const iconData: IconifyJSON = iconSet.export();
    const totalIcons = Object.keys(iconData.icons).length;

    // 4. 写入各文件
    ensureDir(outputDir);

    writeJSON(join(outputDir, 'icons.json'), iconData);
    console.log(`   ✓ Written icons.json (${totalIcons} icons)`);

    // 5. 导出未通过优化的 SVG 文件
    const unnormalKeys = Object.keys(unnormals);
    if (unnormalKeys.length > 0) {
        const unnormalDir = join(outputDir, 'unnormals');
        ensureDir(unnormalDir);
        for (const key of unnormalKeys) {
            writeFileSync(join(unnormalDir, `${key}.svg`), unnormals[key], 'utf8');
        }
        console.log(`   ✓ Written ${unnormalKeys.length} unnormal SVGs to unnormals/`);
    }

    const info: IconifyInfo = { ...infoBase, total: totalIcons, version: iconSetVersion };
    (info as any).prefix = prefix;
    writeJSON(join(outputDir, 'info.json'), info);
    console.log('   ✓ Written info.json');

    writeJSON(join(outputDir, 'metadata.json'), {});
    console.log('   ✓ Written metadata.json');

    writeJSON(join(outputDir, 'chars.json'), {});
    console.log('   ✓ Written chars.json');

    generateIndexJS(outputDir);
    generateIndexMJS(outputDir);
    generateIndexDTS(outputDir);
    console.log('   ✓ Generated index.js / index.mjs / index.d.ts');

    generatePackageJSON(outputDir, config, version, iconSetVersion);
    console.log('   ✓ Generated package.json');

    console.log(`✅ ${prefix} build complete (${totalIcons} icons)`);
}

// ── 入口 ──────────────────────────────────────────────────

function parseArgs(args: string[]): {
    targets: string[];
} {
    const targets: string[] = [];

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg in COLLECTIONS) {
            targets.push(arg);
        }
        i++;
    }

    if (targets.length === 0) {
        targets.push(...Object.keys(COLLECTIONS));
    }

    return { targets };
}

async function main(): Promise<void> {
    const { targets } = parseArgs(process.argv.slice(2));

    console.log(`🔨 Building: ${targets.join(', ')}`);

    for (const target of targets) {
        await buildCollection(COLLECTIONS[target]);
    }

    console.log('\n🎉 All builds complete!');
}

main().catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
