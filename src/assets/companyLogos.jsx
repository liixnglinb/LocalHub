// 平台图标与元信息（2026-08-06 更新 · LobeHub Icons 彩色版）
import React, { useState } from 'react';
import openai from './logos/openai.png';
import claude from './logos/claude.png';
import gemini from './logos/gemini.png';
import deepseek from './logos/deepseek.png';
import qwen from './logos/qwen.png';
import baiducloud from './logos/baiducloud.png';
import bailian from './logos/bailian.png';
import hunyuan from './logos/hunyuan.png';
import doubao from './logos/doubao.png';
import zhipu from './logos/zhipu.png';
import kimi from './logos/kimi.png';
import spark from './logos/spark.png';
import minimax from './logos/minimax.png';
import stepfun from './logos/stepfun.png';
import baichuan from './logos/baichuan.png';
import sensenova from './logos/sensenova.png';
import skywork from './logos/skywork.png';
import kling from './logos/kling.png';
import jimeng from './logos/jimeng.png';
import vidu from './logos/vidu.png';
import pixverse from './logos/pixverse.png';
import suno from './logos/suno.png';
import midjourney from './logos/midjourney.png';
import dalle from './logos/dalle.png';
import stability from './logos/stability.png';
import adobe from './logos/adobe.png';
import flux from './logos/flux.png';
import siliconflow from './logos/siliconflow.svg';

// logo 组件：彩色圆形背景展示，深色背景自动反白图标
const LogoImg = ({ src, size = 28, fallback, bg }) => {
  const [failed, setFailed] = useState(false);
  if (failed && fallback) return fallback({ size });
  const hex = bg ? parseInt(bg.replace('#', ''), 16) : 0;
  const lum = ((hex >> 16) & 0xff) * 0.299 + ((hex >> 8) & 0xff) * 0.587 + (hex & 0xff) * 0.114;
  const invert = bg && lum < 160;
  if (bg) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: size * 0.28, background: bg }}>
        <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '65%', height: '65%', objectFit: 'contain', display: 'block', ...(invert ? { filter: 'brightness(0) invert(1)' } : {}) }} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <img src={src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </span>
  );
};

const COMPANY_LOGOS = {
  'OpenAI': {
    icon: ({ size }) => <LogoImg src={openai} size={size} bg="#000000" />,
    name: 'OpenAI',
    site: 'https://platform.openai.com',
    console: '',
    models: 'GPT-4o / GPT-4.1 / o3 / o4-mini',
    note: '全球最知名的 AI 公司，ChatGPT 开发商',
    bg: '#000000',
  },
  'Claude': {
    icon: ({ size }) => <LogoImg src={claude} size={size} bg="#d97757" />,
    name: 'Anthropic · Claude',
    site: 'https://console.anthropic.com',
    console: '',
    models: 'Claude 4 / Claude 3.5 Sonnet',
    note: 'Anthropic 出品，安全优先的 AI 模型',
    bg: '#d97757',
  },
  'Gemini': {
    icon: ({ size }) => <LogoImg src={gemini} size={size} />,
    name: 'Google · Gemini',
    site: 'https://ai.google.dev',
    console: '',
    models: 'Gemini 2.5 Pro / Gemini 2.5 Flash',
    note: 'Google 出品的多模态大模型',
    bg: '#ffffff',
  },
  'DeepSeek': {
    icon: ({ size }) => <LogoImg src={deepseek} size={size} bg="#4d6bfe" />,
    name: 'DeepSeek 深度求索',
    site: 'https://platform.deepseek.com',
    console: 'https://platform.deepseek.com/api_keys',
    models: 'deepseek-chat / deepseek-reasoner',
    note: '当前最火的国产大模型，价格低、能力强',
    bg: '#4d6bfe',
  },
  '千问 AI': {
    icon: ({ size }) => <LogoImg src={qwen} size={size} bg="#615ced" />,
    name: '千问 AI 平台',
    site: 'https://platform.qianwenai.com',
    console: 'https://platform.qianwenai.com/home/api-keys',
    models: 'Qwen3.7-Max / Qwen3.7-Plus / HappyHorse',
    note: '阿里出品，全模态模型平台',
    bg: '#615ced',
  },
  '百度千帆': {
    icon: ({ size }) => <LogoImg src={baiducloud} size={size} bg="#2468f2" />,
    name: '百度智能云 · 千帆',
    site: 'https://cloud.baidu.com',
    console: 'https://console.bce.baidu.com/qianfan/ais/console/apiKey',
    models: 'ERNIE-4.0-Turbo / ERNIE-Speed',
    note: '百度千帆大模型平台，管理 API 密钥',
    bg: '#2468f2',
  },
  '阿里云百炼': {
    icon: ({ size }) => <LogoImg src={bailian} size={size} bg="#ff6a00" />,
    name: '阿里云 · 百炼',
    site: 'https://bailian.aliyun.com',
    console: 'https://bailian.console.aliyun.com/?apiKey=1',
    models: 'qwen-max / qwen-plus / qwen-turbo',
    note: '通义千问系列，阿里云百炼平台',
    bg: '#ff6a00',
  },
  '腾讯云': {
    icon: ({ size }) => <LogoImg src={hunyuan} size={size} bg="#0052d9" />,
    name: '腾讯云 · 混元大模型',
    site: 'https://cloud.tencent.com',
    console: 'https://console.cloud.tencent.com/tokenhub/models?regionId=1',
    models: 'hunyuan-turbo / hunyuan-pro',
    note: '腾讯混元大模型，腾讯云 TokenHub',
    bg: '#0052d9',
  },
  '字节豆包': {
    icon: ({ size }) => <LogoImg src={doubao} size={size} bg="#325ab4" />,
    name: '火山引擎 · 豆包',
    site: 'https://www.volcengine.com',
    console: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    models: 'doubao-1-5-pro / doubao-seed-1-6',
    note: '字节跳动豆包大模型，火山方舟平台',
    bg: '#325ab4',
  },
  '智谱 GLM': {
    icon: ({ size }) => <LogoImg src={zhipu} size={size} bg="#3859ff" />,
    name: '智谱 AI · GLM',
    site: 'https://open.bigmodel.cn',
    console: 'https://open.bigmodel.cn/apikey/platform',
    models: 'glm-4-plus / glm-4-air',
    note: '清华系，ChatGLM 系列',
    bg: '#3859ff',
  },
  'Kimi': {
    icon: ({ size }) => <LogoImg src={kimi} size={size} bg="#1a1a2e" />,
    name: '月之暗面 · Kimi',
    site: 'https://platform.moonshot.cn',
    console: 'https://platform.moonshot.cn/console/api-keys',
    models: 'moonshot-v1-8k / moonshot-v1-32k',
    note: 'Kimi 智能助手，超长上下文',
    bg: '#1a1a2e',
  },
  '讯飞星火': {
    icon: ({ size }) => <LogoImg src={spark} size={size} bg="#3a6fe0" />,
    name: '讯飞星火大模型',
    site: 'https://www.xfyun.cn',
    console: 'https://console.xfyun.cn/services/bm35',
    models: 'Spark Max / Spark Lite',
    note: '科大讯飞的大模型品牌',
    bg: '#3a6fe0',
  },
  'MiniMax': {
    icon: ({ size }) => <LogoImg src={minimax} size={size} bg="#5c6bc0" />,
    name: 'MiniMax 稀宇科技',
    site: 'https://platform.minimaxi.com',
    console: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    models: 'abab6.5s / MiniMax-Text-01',
    note: 'abab 系列，视频生成也强',
    bg: '#5c6bc0',
  },
  '阶跃星辰': {
    icon: ({ size }) => <LogoImg src={stepfun} size={size} bg="#0ea5e9" />,
    name: '阶跃星辰 StepFun',
    site: 'https://www.stepfun.com',
    console: 'https://platform.stepfun.com/request-management/key-management',
    models: 'step-2-16k / step-1-32k',
    note: 'Step 系列大模型',
    bg: '#0ea5e9',
  },
  '百川智能': {
    icon: ({ size }) => <LogoImg src={baichuan} size={size} bg="#ff6933" />,
    name: '百川智能 Baichuan',
    site: 'https://platform.baichuan-ai.com',
    console: 'https://platform.baichuan-ai.com/console/api-key',
    models: 'Baichuan4 / Baichuan3-Turbo',
    note: '王小川团队，Baichuan 系列',
    bg: '#ff6933',
  },
  '商汤日日新': {
    icon: ({ size }) => <LogoImg src={sensenova} size={size} bg="#dc2626" />,
    name: '商汤 · 日日新 SenseNova',
    site: 'https://www.sensetime.com',
    console: 'https://platform.sensenova.cn/console',
    models: 'SenseChat-5 / SenseChat-Vision',
    note: '商汤科技，日日新大模型',
    bg: '#dc2626',
  },
  '昆仑万维天工': {
    icon: ({ size }) => <LogoImg src={skywork} size={size} bg="#0891b2" />,
    name: '昆仑万维 · 天工',
    site: 'https://www.kunlun.com',
    console: 'https://model-platform.tiangong.cn/login',
    models: 'skywork / Tiangong',
    note: '天工大模型平台（昆仑万维旗下）',
    bg: '#0891b2',
  },
  '硅基流动': {
    icon: ({ size }) => <LogoImg src={siliconflow} size={size} />,
    name: '硅基流动 SiliconFlow',
    site: 'https://siliconflow.cn',
    console: 'https://cloud.siliconflow.cn/account/ak',
    models: 'Qwen / DeepSeek / GLM 等开源模型',
    note: '开源模型聚合平台，一键跑各种开源模型',
    bg: '',
  },
  '可灵 Kling': {
    icon: ({ size }) => <LogoImg src={kling} size={size} bg="#000000" />,
    name: '可灵 AI · Kling',
    site: 'https://www.klingai.com',
    console: 'https://platform.klingai.com',
    models: 'Kling 3.0 / Kling 2.0',
    note: '快手出品，AI 视频生成领先平台',
    bg: '#000000',
  },
  '即梦 Dreamina': {
    icon: ({ size }) => <LogoImg src={jimeng} size={size} bg="#325ab4" />,
    name: '字节跳动 · 即梦 Dreamina',
    site: 'https://jimeng.jianying.com',
    console: 'https://jimeng.jianying.com/ai-tool/home',
    models: 'Dreamina 3.0 / Seedream 5.0',
    note: '字节出品，每日免费 60 积分',
    bg: '#325ab4',
  },
  'Vidu': {
    icon: ({ size }) => <LogoImg src={vidu} size={size} bg="#6366f1" />,
    name: '生数科技 · Vidu',
    site: 'https://www.vidu.com',
    console: 'https://www.vidu.com',
    models: 'Vidu 2.0 / Vidu 1.5',
    note: '清华团队，新用户 400 积分',
    bg: '#6366f1',
  },
  'PixVerse': {
    icon: ({ size }) => <LogoImg src={pixverse} size={size} bg="#8b5cf6" />,
    name: '爱诗科技 · PixVerse',
    site: 'https://pixverse.ai',
    console: 'https://app.pixverse.ai',
    models: 'PixVerse V5 / V4',
    note: '免费不限次，支持 Re-style 换风格',
    bg: '#8b5cf6',
  },
  'Suno': {
    icon: ({ size }) => <LogoImg src={suno} size={size} bg="#e65100" />,
    name: 'Suno AI',
    site: 'https://suno.com',
    console: '',
    models: 'Suno V5.5 / V4',
    note: 'AI 音乐生成，文本生成完整歌曲',
    bg: '#e65100',
  },
  'Midjourney': {
    icon: ({ size }) => <LogoImg src={midjourney} size={size} bg="#6d28d9" />,
    name: 'Midjourney',
    site: 'https://www.midjourney.com',
    console: '',
    models: 'Midjourney V7 / V6.1',
    note: '全球最知名的 AI 图像生成平台',
    bg: '#6d28d9',
  },
  'DALL·E': {
    icon: ({ size }) => <LogoImg src={dalle} size={size} bg="#10b981" />,
    name: 'OpenAI · DALL·E',
    site: 'https://openai.com/dall-e',
    console: '',
    models: 'DALL·E 3 / DALL·E 2',
    note: 'OpenAI 出品的 AI 图像生成模型',
    bg: '#10b981',
  },
  'Stability AI': {
    icon: ({ size }) => <LogoImg src={stability} size={size} bg="#330066" />,
    name: 'Stability AI',
    site: 'https://stability.ai',
    console: '',
    models: 'Stable Diffusion 3.5 / SDXL',
    note: '开源图像生成模型 Stable Diffusion 的创造者',
    bg: '#330066',
  },
  'Adobe': {
    icon: ({ size }) => <LogoImg src={adobe} size={size} bg="#eb1000" />,
    name: 'Adobe Firefly',
    site: 'https://firefly.adobe.com',
    console: '',
    models: 'Firefly Image 3 / Firefly Vector',
    note: 'Adobe 出品的创意生成式 AI 平台',
    bg: '#eb1000',
  },
  'Flux': {
    icon: ({ size }) => <LogoImg src={flux} size={size} bg="#e67e22" />,
    name: 'Black Forest Labs · Flux',
    site: 'https://blackforestlabs.ai',
    console: '',
    models: 'Flux.1 Pro / Flux.1 Dev',
    note: '德国黑森林实验室，高质量开源图像模型',
    bg: '#e67e22',
  },
  '自定义': {
    icon: ({ size }) => (
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, background: '#111116', borderRadius: size * 0.28, border: '1px solid rgba(255,255,255,0.14)' }}>
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none">
          <path d="M12 5 V19 M5 12 H19" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    ),
    name: '自定义',
    site: '',
    console: '',
    models: '',
    note: '其他厂商',
    bg: '#3f3f46',
  },
};

export default COMPANY_LOGOS;