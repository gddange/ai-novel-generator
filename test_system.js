#!/usr/bin/env node

/**
 * 小说生成器系统测试脚本
 * 测试三个agent的协作流程和功能
 */

const fs = require('fs');
const path = require('path');

// 模拟测试数据
const testProject = {
    id: 'test-project-001',
    theme: '科幻冒险',
    genre: '科幻小说',
    description: '一个关于星际探索和人工智能的故事'
};

// 测试结果记录
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(testName, passed, message = '') {
    const result = {
        name: testName,
        passed,
        message,
        timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message ? '- ' + message : ''}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message ? '- ' + message : ''}`);
    }
}

function testFileExists(filePath, description) {
    const exists = fs.existsSync(filePath);
    logTest(`文件存在性检查: ${description}`, exists, filePath);
    return exists;
}

function testDirectoryStructure() {
    console.log('\n🔍 测试目录结构...');
    
    const requiredDirs = [
        'server',
        'server/agents',
        'server/routes',
        'server/services',
        'server/utils',
        'public',
        'public/js'
    ];
    
    requiredDirs.forEach(dir => {
        testFileExists(dir, `目录: ${dir}`);
    });
}

function testCoreFiles() {
    console.log('\n🔍 测试核心文件...');
    
    const coreFiles = [
        { path: 'package.json', desc: '项目配置文件' },
        { path: 'server/app.js', desc: '服务器主文件' },
        { path: 'server/agents/BaseAgent.js', desc: '基础Agent类' },
        { path: 'server/agents/AuthorAgent.js', desc: '作者Agent' },
        { path: 'server/agents/OutlineEditorAgent.js', desc: '大纲编辑Agent' },
        { path: 'server/agents/StyleEditorAgent.js', desc: '润色编辑Agent' },
        { path: 'server/agents/AgentManager.js', desc: 'Agent管理器' },
        { path: 'server/utils/ContextManager.js', desc: '上下文管理器' },
        { path: 'server/services/SearchService.js', desc: '搜索服务' },
        { path: 'public/index.html', desc: '前端主页面' },
        { path: 'public/js/app.js', desc: '前端JavaScript' }
    ];
    
    coreFiles.forEach(file => {
        testFileExists(file.path, file.desc);
    });
}

function testAgentClasses() {
    console.log('\n🔍 测试Agent类结构...');
    
    try {
        // 由于没有Node.js环境，我们只能检查文件内容
        const agentFiles = [
            'server/agents/AuthorAgent.js',
            'server/agents/OutlineEditorAgent.js',
            'server/agents/StyleEditorAgent.js'
        ];
        
        agentFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // 检查关键方法是否存在
                const hasConstructor = content.includes('constructor(');
                const hasSearchMethod = content.includes('search');
                const hasOpenAI = content.includes('openai');
                
                logTest(`${path.basename(filePath)} 结构检查`, 
                    hasConstructor && hasSearchMethod && hasOpenAI,
                    `构造函数: ${hasConstructor}, 搜索功能: ${hasSearchMethod}, OpenAI集成: ${hasOpenAI}`
                );
            }
        });
    } catch (error) {
        logTest('Agent类结构测试', false, error.message);
    }
}

function testSearchIntegration() {
    console.log('\n🔍 测试搜索功能集成...');
    
    try {
        if (fs.existsSync('server/services/SearchService.js')) {
            const content = fs.readFileSync('server/services/SearchService.js', 'utf8');
            
            const hasSearchMethod = content.includes('async search(');
            const hasCache = content.includes('cache');
            const hasHistory = content.includes('history');
            
            logTest('SearchService功能检查', 
                hasSearchMethod && hasCache && hasHistory,
                `搜索方法: ${hasSearchMethod}, 缓存: ${hasCache}, 历史: ${hasHistory}`
            );
        }
        
        // 检查搜索路由
        if (fs.existsSync('server/routes/search.js')) {
            const content = fs.readFileSync('server/routes/search.js', 'utf8');
            const hasRoutes = content.includes('router.post') && content.includes('router.get');
            
            logTest('搜索路由检查', hasRoutes, '包含POST和GET路由');
        }
    } catch (error) {
        logTest('搜索功能集成测试', false, error.message);
    }
}

function testContextManager() {
    console.log('\n🔍 测试上下文管理器...');
    
    try {
        if (fs.existsSync('server/utils/ContextManager.js')) {
            const content = fs.readFileSync('server/utils/ContextManager.js', 'utf8');
            
            const hasAddMessage = content.includes('addMessage');
            const hasCompress = content.includes('compress');
            const hasImportance = content.includes('importance');
            const hasForget = content.includes('forget');
            
            logTest('ContextManager功能检查', 
                hasAddMessage && hasCompress && hasImportance && hasForget,
                `添加消息: ${hasAddMessage}, 压缩: ${hasCompress}, 重要性: ${hasImportance}, 遗忘: ${hasForget}`
            );
        }
    } catch (error) {
        logTest('上下文管理器测试', false, error.message);
    }
}

function testAPIRoutes() {
    console.log('\n🔍 测试API路由...');
    
    const routeFiles = [
        { path: 'server/routes/agents.js', desc: 'Agent路由' },
        { path: 'server/routes/novels.js', desc: '小说路由' },
        { path: 'server/routes/search.js', desc: '搜索路由' }
    ];
    
    routeFiles.forEach(route => {
        if (fs.existsSync(route.path)) {
            const content = fs.readFileSync(route.path, 'utf8');
            const hasRoutes = content.includes('router.') && content.includes('module.exports');
            
            logTest(`${route.desc}检查`, hasRoutes, '包含路由定义和导出');
        }
    });
}

function testFrontend() {
    console.log('\n🔍 测试前端界面...');
    
    try {
        if (fs.existsSync('public/index.html')) {
            const content = fs.readFileSync('public/index.html', 'utf8');
            
            const hasTitle = content.includes('AI小说生成器');
            const hasForm = content.includes('<form');
            const hasScript = content.includes('<script');
            
            logTest('前端HTML检查', 
                hasTitle && hasForm && hasScript,
                `标题: ${hasTitle}, 表单: ${hasForm}, 脚本: ${hasScript}`
            );
        }
        
        if (fs.existsSync('public/js/app.js')) {
            const content = fs.readFileSync('public/js/app.js', 'utf8');
            
            const hasClass = content.includes('class NovelGeneratorApp');
            const hasAPI = content.includes('fetch(');
            const hasEventListeners = content.includes('addEventListener');
            
            logTest('前端JavaScript检查', 
                hasClass && hasAPI && hasEventListeners,
                `应用类: ${hasClass}, API调用: ${hasAPI}, 事件监听: ${hasEventListeners}`
            );
        }
    } catch (error) {
        logTest('前端界面测试', false, error.message);
    }
}

function testPackageJson() {
    console.log('\n🔍 测试项目配置...');
    
    try {
        if (fs.existsSync('package.json')) {
            const content = fs.readFileSync('package.json', 'utf8');
            const packageData = JSON.parse(content);
            
            const hasDependencies = packageData.dependencies && Object.keys(packageData.dependencies).length > 0;
            const hasScripts = packageData.scripts && Object.keys(packageData.scripts).length > 0;
            const hasRequiredDeps = packageData.dependencies && 
                packageData.dependencies.express && 
                packageData.dependencies.openai;
            
            logTest('package.json检查', 
                hasDependencies && hasScripts && hasRequiredDeps,
                `依赖项: ${hasDependencies}, 脚本: ${hasScripts}, 必需依赖: ${hasRequiredDeps}`
            );
        }
    } catch (error) {
        logTest('项目配置测试', false, error.message);
    }
}

function generateTestReport() {
    console.log('\n📊 生成测试报告...');
    
    const report = {
        summary: {
            total: testResults.tests.length,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: ((testResults.passed / testResults.tests.length) * 100).toFixed(2) + '%'
        },
        timestamp: new Date().toISOString(),
        tests: testResults.tests
    };
    
    // 保存测试报告
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    
    console.log(`\n📋 测试总结:`);
    console.log(`总测试数: ${report.summary.total}`);
    console.log(`通过: ${report.summary.passed}`);
    console.log(`失败: ${report.summary.failed}`);
    console.log(`成功率: ${report.summary.successRate}`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.tests
            .filter(test => !test.passed)
            .forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
    }
    
    console.log('\n📄 详细报告已保存到: test-report.json');
}

function runSystemTest() {
    console.log('🚀 开始小说生成器系统测试...\n');
    
    // 运行所有测试
    testDirectoryStructure();
    testCoreFiles();
    testPackageJson();
    testAgentClasses();
    testContextManager();
    testSearchIntegration();
    testAPIRoutes();
    testFrontend();
    
    // 生成报告
    generateTestReport();
    
    console.log('\n✨ 系统测试完成！');
    
    // 返回测试结果
    return testResults.failed === 0;
}

// 运行测试
if (require.main === module) {
    const success = runSystemTest();
    process.exit(success ? 0 : 1);
}

module.exports = { runSystemTest, testResults };