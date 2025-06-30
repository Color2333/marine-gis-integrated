// src/services/deepseekAPI.ts
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface DeepSeekChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage: DeepSeekUsage;
}

export interface GliderDataPoint {
  index: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  expectedHeading: number;
  currentHeading: number;
  waterTemp: number;
  windSpeed: number;
  windDirection: number;
  speed: number;
}

export interface PredictedPoint {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  estimatedTime?: string;
  confidence: number;
}

export interface PredictionResult {
  predictedPoints: PredictedPoint[];
  confidence: number;
  analysis: string;
  factors: string[];
  executionTime: number;
}

export class DeepSeekAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'DeepSeekAPIError';
  }
}

export class DeepSeekAPI {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    this.baseURL = import.meta.env.VITE_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    
    if (!this.apiKey || this.apiKey === 'your_deepseek_api_key_here') {
      throw new DeepSeekAPIError(
        'DeepSeek API Key 未配置。请在 .env 文件中设置 VITE_DEEPSEEK_API_KEY'
      );
    }
  }

  /**
   * 构建 AI 预测的 system prompt
   */
  private buildSystemPrompt(): string {
    return `你是一个专业的海洋滑翔机航迹预测专家。你的任务是基于历史观测数据预测滑翔机的未来航迹。

你需要分析以下要素：
1. 历史位置坐标（纬度、经度）
2. 理想航向 vs 实际航向的差异
3. 海水温度变化
4. 风速和风向影响
5. 滑翔机速度趋势

请基于输入的历史数据，预测指定数量的未来航迹点。

输出格式要求：严格按照以下 JSON 格式返回，不要包含任何其他文本：
{
  "predictedPoints": [
    {
      "latitude": 纬度值,
      "longitude": 经度值,
      "heading": 航向角度(0-360),
      "speed": 速度(km/h),
      "confidence": 置信度(0-1)
    }
  ],
  "confidence": 整体置信度(0-1),
  "analysis": "详细分析说明",
  "factors": ["影响因素1", "影响因素2", "影响因素3"]
}

注意：
- 坐标精确到小数点后6位
- 航向角度为0-360度，0度为正北方向
- 置信度考虑数据质量、趋势稳定性等因素
- 分析要专业、简洁，重点说明预测依据
- 影响因素要具体，包含海流、风向、温度等`;
  }

  /**
   * 构建用户输入的 prompt
   */
  private buildUserPrompt(
    trainingData: GliderDataPoint[],
    predictPointsCount: number,
    includeHeading: boolean,
    includeSpeed: boolean
  ): string {
    const dataDescription = trainingData
      .map((point, index) => 
        `第${index + 1}个点: 时间=${point.timestamp}, 坐标=(${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}), ` +
        `理想航向=${point.expectedHeading.toFixed(1)}°, 实际航向=${point.currentHeading.toFixed(1)}°, ` +
        `水温=${point.waterTemp.toFixed(1)}°C, 风速=${point.windSpeed.toFixed(1)}m/s, 风向=${point.windDirection.toFixed(1)}°, ` +
        `速度=${point.speed.toFixed(2)}km/h`
      )
      .join('\n');

    return `请基于以下 ${trainingData.length} 个历史观测数据点，预测滑翔机未来 ${predictPointsCount} 个航迹点：

历史数据：
${dataDescription}

预测要求：
- 预测点数量：${predictPointsCount} 个
- 包含航向：${includeHeading ? '是' : '否'}
- 包含速度：${includeSpeed ? '是' : '否'}
- 考虑海洋环境因素（海流、风向、温度梯度等）
- 分析航向偏差的规律性
- 评估预测的置信度

请严格按照系统提示中的 JSON 格式返回预测结果。`;
  }

  /**
   * 调用 DeepSeek API 进行航迹预测
   */
  async predictTrajectory(
    trainingData: GliderDataPoint[],
    predictPointsCount: number,
    model: string = 'deepseek-chat',
    includeHeading: boolean = true,
    includeSpeed: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<PredictionResult> {
    const startTime = Date.now();
    
    try {
      // 构建请求消息
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        {
          role: 'user',
          content: this.buildUserPrompt(trainingData, predictPointsCount, includeHeading, includeSpeed)
        }
      ];

      const requestBody: DeepSeekRequest = {
        model: model,
        messages: messages,
        temperature: 0.3, // 较低的温度确保更稳定的预测
        max_tokens: 2000,
        stream: false
      };

      onProgress?.(20);

      // 发起 API 请求
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      onProgress?.(60);

      if (!response.ok) {
        const errorText = await response.text();
        throw new DeepSeekAPIError(
          `API 请求失败: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data: DeepSeekResponse = await response.json();
      onProgress?.(80);

      // 检查响应格式
      if (!data.choices || data.choices.length === 0) {
        throw new DeepSeekAPIError('API 返回了空的选择结果');
      }

      const aiResponse = data.choices[0].message.content;
      onProgress?.(90);

      // 解析 AI 返回的 JSON 结果
      let parsedResult;
      try {
        // 提取 JSON 内容（去除可能的代码块标记）
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('未找到有效的 JSON 响应');
        }
        
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // console.error('JSON 解析失败:', parseError);
        // console.error('原始响应:', aiResponse);
        throw new DeepSeekAPIError(`AI 响应格式不正确: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }

      // 验证返回结果的结构
      if (!parsedResult.predictedPoints || !Array.isArray(parsedResult.predictedPoints)) {
        throw new DeepSeekAPIError('AI 返回结果缺少 predictedPoints 字段或格式不正确');
      }

      const executionTime = Date.now() - startTime;
      onProgress?.(100);

      // 构建最终结果
      const result: PredictionResult = {
        predictedPoints: parsedResult.predictedPoints.map((point: any, index: number) => ({
          latitude: Number(point.latitude) || 0,
          longitude: Number(point.longitude) || 0,
          heading: includeHeading ? Number(point.heading) || undefined : undefined,
          speed: includeSpeed ? Number(point.speed) || undefined : undefined,
          estimatedTime: undefined, // 暂不预测具体时间
          confidence: Number(point.confidence) || 0.5
        })),
        confidence: Number(parsedResult.confidence) || 0.5,
        analysis: parsedResult.analysis || 'AI 分析结果不可用',
        factors: Array.isArray(parsedResult.factors) ? parsedResult.factors : ['数据质量良好', '趋势相对稳定'],
        executionTime
      };

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof DeepSeekAPIError) {
        throw error;
      }
      
      throw new DeepSeekAPIError(
        `网络请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
        undefined,
        error
      );
    }
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<{ connected: boolean; latency: number; message: string }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      const latency = Date.now() - startTime;
      
      if (response.ok || response.status === 400) {
        // 400 也算连接成功，只是请求格式可能有问题
        return {
          connected: true,
          latency,
          message: latency < 2000 ? 'DeepSeek API 响应良好' : 
                   latency < 5000 ? 'DeepSeek API 响应一般' : 'DeepSeek API 响应较慢'
        };
      } else if (response.status === 401) {
        return {
          connected: false,
          latency,
          message: 'API Key 无效或已过期'
        };
      } else {
        return {
          connected: false,
          latency,
          message: `连接失败: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

// 默认导出 API 实例
export const deepSeekAPI = new DeepSeekAPI();
