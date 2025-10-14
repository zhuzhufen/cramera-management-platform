// 测试代理人添加相机功能的脚本
// 在浏览器控制台中运行这些命令来测试功能

// 测试代理人选择器功能
function testAgentSelector() {
    console.log('=== 测试代理人选择器功能 ===');
    
    // 检查当前用户信息
    console.log('当前用户:', currentUser);
    
    // 检查代理人选择器是否存在
    const agentSelect = document.getElementById('agent-select');
    console.log('代理人选择器:', agentSelect);
    
    if (agentSelect) {
        console.log('代理人选择器选项数量:', agentSelect.options.length);
        console.log('当前选择的值:', agentSelect.value);
        console.log('所有选项:');
        for (let i = 0; i < agentSelect.options.length; i++) {
            console.log(`  [${i}] ${agentSelect.options[i].value} - ${agentSelect.options[i].text}`);
        }
    }
    
    // 测试重置相机表单
    console.log('=== 测试重置相机表单 ===');
    resetCameraForm();
    
    // 再次检查代理人选择器
    setTimeout(() => {
        console.log('重置后的代理人选择器值:', agentSelect.value);
    }, 100);
}

// 测试代理人界面显示
function testAgentUI() {
    console.log('=== 测试代理人界面显示 ===');
    
    const addCameraBtn = document.getElementById('add-camera-btn');
    const agentInput = document.getElementById('agent-input');
    const usersTab = document.querySelector('[data-tab="users"]');
    
    console.log('添加相机按钮显示状态:', addCameraBtn ? addCameraBtn.style.display : '未找到');
    console.log('代理人筛选输入框显示状态:', agentInput ? agentInput.style.display : '未找到');
    console.log('用户管理标签显示状态:', usersTab ? usersTab.style.display : '未找到');
}

// 运行测试
console.log('开始测试代理人功能...');
testAgentUI();
setTimeout(testAgentSelector, 500);

// 手动测试步骤：
// 1. 使用代理人账号登录
// 2. 点击"添加相机"按钮
// 3. 检查代理人选择器是否显示当前代理人的名称
// 4. 尝试添加相机，确认代理人字段自动设置为当前代理人
