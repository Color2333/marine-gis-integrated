# AI 航迹预测功能配置指南

## 概述

本项目的 AI 航迹预测功能使用 DeepSeek API 进行真实的航迹预测分析。该功能可以基于滑翔机的历史观测数据，预测其未来的航行轨迹。

## 配置步骤

### 1. 获取 DeepSeek API Key

1. 访问 [DeepSeek API 官网](https://api.deepseek.com)
2. 注册账号并获取 API Key
3. 确保账户有足够的余额用于 API 调用

### 2. 配置环境变量

1. 在项目根目录复制 `.env.example` 文件：

   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，替换 API Key：
   ```env
   VITE_DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
   VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   ```

### 3. 重启开发服务器

```bash
npm run dev
```

## 功能特性

### AI 模型选择

- **deepseek-chat**：通用对话模型，适合航迹预测（推荐）
- **deepseek-coder**：代码专用模型
- **deepseek-reasoner**：推理专用模型

### 预测参数

- **历史数据点数**：10-25 个点（推荐 10-15 个）
- **预测点数**：3-10 个点（推荐 5 个）
- **预测内容**：位置坐标、航向角度、航行速度等

### 数据输入

AI 分析的数据包括：

- 历史位置坐标（纬度、经度）
- 理想航向 vs 实际航向
- 海水温度
- 风速和风向
- 滑翔机速度

## API 使用说明

### 连接状态监控

- 系统会自动检测 API 连接状态
- 显示连接延迟和状态信息
- 自动重连和错误处理

### 预测流程

1. 选择历史数据范围
2. 配置预测参数
3. 点击"开始预测"
4. 等待 AI 分析完成
5. 查看预测结果和分析报告

### 结果解析

- **预测点**：包含坐标、航向、速度、置信度
- **整体置信度**：基于数据质量和趋势稳定性
- **AI 分析**：专业的航迹分析报告
- **影响因素**：海流、风向、温度等环境因素

## 安全注意事项

### API Key 安全

- ⚠️ **重要**：不要将 API Key 提交到版本控制系统
- `.env` 文件已在 `.gitignore` 中排除
- 生产环境建议使用后端代理 API Key

### 数据隐私

- API 调用会将滑翔机数据发送到 DeepSeek 服务器
- 请确保数据使用符合相关法规要求
- 敏感数据建议使用本地部署方案

## 故障排除

### 常见错误

1. **API Key 未配置**

   ```
   错误：DeepSeek API Key 未配置
   解决：检查 .env 文件中的 VITE_DEEPSEEK_API_KEY 配置
   ```

2. **API Key 无效**

   ```
   错误：API Key 无效或已过期
   解决：检查 API Key 是否正确，账户是否有余额
   ```

3. **网络连接失败**

   ```
   错误：网络请求失败
   解决：检查网络连接，确认可以访问 api.deepseek.com
   ```

4. **JSON 解析失败**
   ```
   错误：AI 响应格式不正确
   解决：通常为 API 服务临时问题，可重试
   ```

### 调试方法

1. 打开浏览器开发者工具的 // console 标签页
2. 查看详细的错误日志和 API 响应
3. 检查网络标签页中的 API 请求状态

## 高级配置

### 自定义 API 端点

如需使用不同的 API 端点，可在 `.env` 文件中修改：

```env
VITE_DEEPSEEK_API_URL=https://your-custom-api-endpoint.com/v1/chat/completions
```

### 后端代理（推荐用于生产环境）

为了提高安全性，建议在生产环境中使用后端代理：

1. 在后端服务器中配置 API Key
2. 创建代理接口：`/api/ai/predict`
3. 修改前端 `deepseekAPI.ts` 中的 `baseURL`

## 技术实现

### 核心文件

- `src/services/deepseekAPI.ts`：API 服务封装
- `src/components/ai/AIPredictionPanel.tsx`：UI 组件
- `.env`：环境变量配置

### Prompt 工程

系统使用精心设计的 prompt 来指导 AI 进行航迹预测：

- 系统提示词定义了专家角色和输出格式
- 用户提示词包含历史数据和预测要求
- 严格的 JSON 格式确保结果解析的可靠性

## 许可证和使用条款

请确保遵守 DeepSeek API 的使用条款和相关法律法规。
