import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface LbModel {
  vendor?: string;
  name?: string;
  open?: boolean;
  lang?: string[];
  released?: string;
  detail?: string;
  scores?: { low?: number; mid?: number; high?: number };
}

/** BenchLM 机器可读接口 */
const LEADERBOARD_URL = 'https://benchlm.ai/data/leaderboard.json';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'application/json' };

/** 国内厂商 key（用于 lang 判断） */
const CN_VENDORS = new Set([
  'deepseek', 'alibaba', 'moonshot', 'zhipu', 'baidu', 'tencent',
  'bytedance', 'minimax', 'yi', 'baichuan', 'stepfun', 'xunfei', 'sense',
  'xiaomi', 'inclusion',
]);

const CN_COLOR = ['#4D6BFE', '#615CED', '#7C5CFF', '#165DFF', '#2932E1', '#006EFF', '#00AEEC', '#FF6B81', '#E22C39', '#FF6A00', '#0BB6B4', '#00468B', '#0066CC'];
const EN_COLOR = ['#CC5500', '#0E8347', '#1A73E8', '#111111', '#0866FF', '#F7A600', '#39594D', '#FF9900'];

/** 各榜单对应的 BenchLM source 字段路径 */
const SOURCES = [
  { tab: 'overall', field: 'items' },
  { tab: 'code', field: 'categories.coding' },
  { tab: 'math', field: 'categories.math' },
  { tab: 'agent', field: 'categories.agentic' },
  { tab: 'reasoning', field: 'categories.reasoning' },
  { tab: 'knowledge', field: 'categories.knowledge' },
  { tab: 'multimodal', field: 'categories.multimodalGrounded' },
  { tab: 'multilingual', field: 'categories.multilingual' },
  { tab: 'instruction', field: 'categories.instructionFollowing' },
];

@Injectable()
export class LeaderboardService {
  private LB_DATA: any = null;

  private dataFile(): string {
    return process.env.LB_DATA_FILE || path.join(__dirname, '..', '..', 'data', 'models.json');
  }

  private emptyData() {
    return { TABS: [], VENDORS: {}, AXIS_RANGE: { min: 0, max: 100, step: 10 }, LEADERBOARD: {}, STRENGTHS: [], DEFAULT_STRENGTH: 'high' };
  }

  private load(force = false) {
    if (this.LB_DATA && !force) return this.LB_DATA;
    const seedPath = this.dataFile();
    try {
      if (fs.existsSync(seedPath)) {
        this.LB_DATA = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      } else {
        this.LB_DATA = this.emptyData();
      }
    } catch {
      this.LB_DATA = this.emptyData();
    }
    return this.LB_DATA;
  }

  getConfig() {
    const d = this.load();
    return {
      tabs: (d.TABS || []).map((t: any) => ({ id: t.id, label: t.label, icon: t.icon })),
      strengths: d.STRENGTHS || [],
      defaultStrength: d.DEFAULT_STRENGTH || 'high',
      axis: d.AXIS_RANGE || { min: 0, max: 100, step: 10 },
      vendors: Object.fromEntries(
        Object.entries(d.VENDORS || {}).map(([k, v]: [string, any]) => [
          k,
          { label: v.label, name: v.name, country: v.country, color: v.color, domain: v.domain },
        ]),
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  getTab(tabId: string, search?: string) {
    const d = this.load();
    const data: LbModel[] = (d.LEADERBOARD || {})[tabId];
    if (!Array.isArray(data)) throw new BadRequestException('未知榜单类型: ' + tabId);

    const q = (search || '').trim().toLowerCase();
    let list = data;
    if (q) {
      list = data.filter((m) => {
        const ven = (d.VENDORS || {})[m.vendor || ''];
        return (m.name || '').toLowerCase().includes(q)
          || (ven && (ven.name || '').toLowerCase().includes(q))
          || (ven && (ven.label || '').toLowerCase().includes(q));
      });
    }

    const rows = list.map((m) => {
      const s = m.scores || {};
      const score = Math.max(s.low || 0, s.mid || 0, s.high || 0);
      const ven = (d.VENDORS || {})[m.vendor || ''] || { label: '?', name: m.vendor, country: '', color: '#888', domain: '' };
      return {
        id: `${tabId}-${m.vendor}-${m.name}`,
        rank: 0,
        score,
        strengthId: 'mid',
        strengthLabel: '综合',
        strengthEng: 'BenchAlign',
        name: m.name,
        open: m.open,
        lang: m.lang,
        released: m.released,
        detail: m.detail,
        vendor: { key: m.vendor, label: ven.label, name: ven.name, country: ven.country, color: ven.color, domain: ven.domain },
      };
    });
    rows.sort((a, b) => b.score - a.score).forEach((r, i) => { r.rank = i + 1; });

    return { tabId, total: rows.length, strengths: d.STRENGTHS || [], list: rows };
  }

  /* ============================================================
     BenchLM 同步（移植自 scraper.js）
     ============================================================ */

  private mapVendorByCreator(creator: string): string | null {
    const o = String(creator || '').toLowerCase();
    if (/anthropic/.test(o)) return 'anthropic';
    if (/open\s?ai|gpt/.test(o)) return 'openai';
    if (/google|deep\s?mind|gemini|^bard/.test(o)) return 'google';
    if (/x\s?ai|grok/.test(o)) return 'xai';
    if (/meta|facebook/.test(o)) return 'meta';
    if (/mistral/.test(o)) return 'mistral';
    if (/cohere/.test(o)) return 'cohere';
    if (/amazon|aws/.test(o)) return 'amazon';
    if (/deepseek/.test(o)) return 'deepseek';
    if (/alibaba|qwen|tongyi/.test(o)) return 'alibaba';
    if (/moonshot|kimi/.test(o)) return 'moonshot';
    if (/z\.?ai|zhipu|glm/.test(o)) return 'zhipu';
    if (/baidu|ernie|wenxin/.test(o)) return 'baidu';
    if (/tencent|hunyuan/.test(o)) return 'tencent';
    if (/bytedance|byte|doubao|seed/.test(o)) return 'bytedance';
    if (/minimax/.test(o)) return 'minimax';
    if (/zero\s?one|01\.ai|(^|\b)yi(\b|$)/.test(o)) return 'yi';
    if (/baichuan/.test(o)) return 'baichuan';
    if (/step/.test(o)) return 'stepfun';
    if (/iflytek|讯飞|spark|xfyun/.test(o)) return 'xunfei';
    if (/sense/.test(o)) return 'sense';
    if (/xiaomi|mi\s?mo/.test(o)) return 'xiaomi';
    if (/inclusion/.test(o)) return 'inclusion';
    return null;
  }

  private vendorInfo(key: string) {
    const isCn = CN_VENDORS.has(key);
    const palette = isCn ? CN_COLOR : EN_COLOR;
    const idx = [...CN_VENDORS].indexOf(key);
    return {
      label: key.slice(0, 2).toUpperCase(),
      name: key,
      country: isCn ? '中国' : '海外',
      color: palette[idx >= 0 ? idx : 0],
      domain: '',
    };
  }

  private cleanName(name: string): string {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  private num(v: any): number {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  private round1(v: number): number {
    return Math.round(v * 10) / 10;
  }

  private getByPath(obj: any, field: string): any {
    return field.split('.').reduce((o: any, k: string) => (o == null ? undefined : o[k]), obj);
  }

  private async fetchLeaderboard(): Promise<any> {
    const r = await fetch(LEADERBOARD_URL, { headers: HEADERS });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${LEADERBOARD_URL}`);
    return r.json();
  }

  private parseRow(it: any): any {
    const vendor = this.mapVendorByCreator(it.creator);
    if (!vendor) return null;
    const score = this.num(it.displayScore);
    if (score <= 0) return null;

    const iv = it.scoreInterval90 || {};
    const detail = {
      'BenchAlign': this.round1(score),
      '置信区间': `${iv.lower ?? '-'}–${iv.upper ?? '-'}`,
      '证据状态': it.evidenceStatus || '-',
      '推理类型': it.reasoningType || '-',
      '上下文': it.contextWindow || '-',
    };

    return {
      vendor,
      name: this.cleanName(it.model),
      open: /open/i.test(it.sourceType || ''),
      lang: CN_VENDORS.has(vendor) ? 'zh' : 'en',
      released: '',
      scores: { low: this.round1(score), mid: this.round1(score), high: this.round1(score) },
      detail,
    };
  }

  private keyOf(model: any): string {
    return String(model.vendor) + '|' + String(model.name);
  }

  private mergeInto(existing: any[], additions: any[]) {
    const map = new Map(existing.map((m) => [this.keyOf(m), m]));
    let added = 0;
    let updated = 0;
    for (const add of additions) {
      const k = this.keyOf(add);
      if (map.has(k)) {
        const cur = map.get(k);
        let changed = false;
        if (add.released && !cur.released) { cur.released = add.released; changed = true; }
        if (add.detail) {
          const merged = Object.assign({}, add.detail, cur.detail);
          if (JSON.stringify(merged) !== JSON.stringify(cur.detail)) {
            cur.detail = merged;
            changed = true;
          }
        }
        if (changed) updated++;
        continue;
      }
      map.set(k, add);
      added++;
    }
    return { list: [...map.values()], added, updated };
  }

  async sync() {
    const persisted = this.load(true);
    const VEND = Object.assign({}, persisted.VENDORS);
    const report: any = { fetchedAt: new Date().toISOString(), sources: [], addedTotal: 0, updatedTotal: 0 };

    let lb: any;
    try {
      lb = await this.fetchLeaderboard();
    } catch (e: any) {
      throw new InternalServerErrorException('获取 BenchLM 数据失败: ' + e.message);
    }

    for (const src of SOURCES) {
      const rows = this.getByPath(lb, src.field) || [];
      const additions: any[] = [];
      for (const it of rows) {
        const m = this.parseRow(it);
        if (m) additions.push(m);
      }
      for (const a of additions) {
        if (!VEND[a.vendor]) VEND[a.vendor] = this.vendorInfo(a.vendor);
      }
      const { list, added, updated } = this.mergeInto(persisted.LEADERBOARD[src.tab] || [], additions);
      persisted.LEADERBOARD[src.tab] = list;
      report.addedTotal += added;
      report.updatedTotal += updated;
      report.sources.push({
        tab: src.tab,
        ok: true,
        parsed: additions.length,
        added,
        updated,
        total: list.length,
      });
    }

    persisted.VENDORS = VEND;
    try {
      fs.writeFileSync(this.dataFile(), JSON.stringify(persisted, null, 2), 'utf-8');
    } catch (e: any) {
      throw new InternalServerErrorException('写入榜单数据失败: ' + e.message);
    }
    this.LB_DATA = persisted; // 热更新内存

    return { ok: true, report };
  }
}