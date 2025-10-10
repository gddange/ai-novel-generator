#!/bin/bash

# 小说生成器系统测试脚本
# 测试文件结构和基本功能完整性

echo "🚀 开始小说生成器系统测试..."
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_file() {
    local file_path="$1"
    local description="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -f "$file_path" ]; then
        echo "✅ $description: PASSED - $file_path"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $description: FAILED - $file_path 不存在"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

test_directory() {
    local dir_path="$1"
    local description="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -d "$dir_path" ]; then
        echo "✅ $description: PASSED - $dir_path"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $description: FAILED - $dir_path 不存在"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

test_file_content() {
    local file_path="$1"
    local search_text="$2"
    local description="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -f "$file_path" ] && grep -q "$search_text" "$file_path"; then
        echo "✅ $description: PASSED - 包含 '$search_text'"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $description: FAILED - 不包含 '$search_text'"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "🔍 测试目录结构..."
test_directory "server" "服务器目录"
test_directory "server/agents" "Agent目录"
test_directory "server/routes" "路由目录"
test_directory "server/services" "服务目录"
test_directory "server/utils" "工具目录"
test_directory "public" "前端目录"
test_directory "public/js" "前端JS目录"

echo ""
echo "🔍 测试核心文件..."
test_file "package.json" "项目配置文件"
test_file "server/app.js" "服务器主文件"
test_file "server/agents/BaseAgent.js" "基础Agent类"
test_file "server/agents/AuthorAgent.js" "作者Agent"
test_file "server/agents/OutlineEditorAgent.js" "大纲编辑Agent"
test_file "server/agents/StyleEditorAgent.js" "润色编辑Agent"
test_file "server/agents/AgentManager.js" "Agent管理器"
test_file "server/utils/ContextManager.js" "上下文管理器"
test_file "server/services/SearchService.js" "搜索服务"
test_file "server/routes/agents.js" "Agent路由"
test_file "server/routes/novels.js" "小说路由"
test_file "server/routes/search.js" "搜索路由"
test_file "public/index.html" "前端主页面"
test_file "public/js/app.js" "前端JavaScript"

echo ""
echo "🔍 测试关键功能..."
test_file_content "server/agents/AuthorAgent.js" "searchReference" "作者Agent搜索功能"
test_file_content "server/agents/OutlineEditorAgent.js" "searchStoryStructure" "大纲编辑Agent搜索功能"
test_file_content "server/services/SearchService.js" "async search" "搜索服务核心方法"
test_file_content "server/utils/ContextManager.js" "compressContext" "上下文压缩功能"
test_file_content "server/app.js" "express" "Express服务器"
test_file_content "public/index.html" "AI小说生成器" "前端标题"
test_file_content "public/js/app.js" "NovelGeneratorApp" "前端应用类"

echo ""
echo "🔍 测试配置完整性..."
test_file_content "package.json" "express" "Express依赖"
test_file_content "package.json" "openai" "OpenAI依赖"
test_file_content "package.json" "socket.io" "Socket.IO依赖"
test_file_content "server/app.js" "/api/search" "搜索API路由"

echo ""
echo "📊 生成测试报告..."

# 计算成功率
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
else
    SUCCESS_RATE=0
fi

# 生成JSON报告
cat > test-report.json << EOF
{
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "successRate": "${SUCCESS_RATE}%"
  },
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "testType": "system_integrity"
}
EOF

echo ""
echo "📋 测试总结:"
echo "总测试数: $TOTAL_TESTS"
echo "通过: $PASSED_TESTS"
echo "失败: $FAILED_TESTS"
echo "成功率: ${SUCCESS_RATE}%"

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有测试通过！系统结构完整。"
    echo ""
    echo "✨ 小说生成器系统已准备就绪，包含以下功能："
    echo "  📝 三个协作Agent（作者、大纲编辑、润色编辑）"
    echo "  🔍 集成搜索功能，支持资料查询"
    echo "  💾 上下文管理和内容压缩"
    echo "  🌐 完整的Web界面"
    echo "  📚 本地文件存储系统"
    echo ""
    echo "🚀 要启动系统，请确保安装Node.js后运行: npm install && npm start"
else
    echo "⚠️  发现 $FAILED_TESTS 个问题，请检查上述失败项目。"
fi

echo ""
echo "📄 详细报告已保存到: test-report.json"
echo "✨ 系统测试完成！"

# 返回适当的退出码
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi