import { Grow } from '../models/Grow.model';
import { Entry } from '../models/Entry.model';
import { redis } from '../config/redis';

export class StatsService {
  async calculateGrowStats(growId: string): Promise<any> {
    const cacheKey = `stats:grow:${growId}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const grow = await Grow.findById(growId);
    if (!grow) return null;
    
    const entries = await Entry.find({ growId }).sort({ week: 1, day: 1 });
    
    const stats = {
      daysRunning: grow.daysRunning,
      weeksRunning: Math.ceil(grow.daysRunning / 7),
      entriesCount: entries.length,
      photosCount: entries.reduce((sum, e) => sum + e.photoCount, 0),
      
      currentHeight: entries.slice(-1)[0]?.height || null,
      heightGrowth: this.calculateHeightGrowth(entries),
      avgWeeklyGrowth: this.calculateAvgGrowth(entries),
      
      avgTemperature: this.calculateAvg(entries, 'temperature'),
      avgHumidity: this.calculateAvg(entries, 'humidity'),
      avgVPD: this.calculateAvg(entries, 'vpd'),
      avgPH: this.calculateAvg(entries, 'ph'),
      avgEC: this.calculateAvg(entries, 'ec'),
      
      wateringFrequency: entries.filter(e => e.watered).length,
      feedingFrequency: entries.filter(e => e.fed).length,
      trainingCount: entries.filter(e => e.trained).length,
      
      yieldDry: grow.yieldDry,
      yieldWet: grow.yieldWet,
      efficiency: grow.efficiency,
      
      estimatedHarvest: grow.status === 'flowering' ? 
        this.estimateHarvest(grow, entries) : null,
      daysToHarvest: grow.status === 'flowering' ?
        this.estimateDaysToHarvest(grow, entries) : null
    };
    
    await redis.setEx(cacheKey, 300, JSON.stringify(stats));
    
    return stats;
  }
  
  private calculateHeightGrowth(entries: any[]): number[] {
    return entries
      .filter(e => e.height)
      .map(e => e.height);
  }
  
  private calculateAvgGrowth(entries: any[]): number {
    const heights = entries.filter(e => e.height).map(e => e.height);
    if (heights.length < 2) return 0;
    
    const first = heights[0];
    const last = heights[heights.length - 1];
    const weeks = entries.slice(-1)[0]?.week || 1;
    
    return parseFloat(((last - first) / weeks).toFixed(1));
  }
  
  private calculateAvg(entries: any[], field: string): number | null {
    const values = entries.filter(e => e[field]).map(e => e[field]);
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return parseFloat(avg.toFixed(1));
  }
  
  private estimateHarvest(grow: any, entries: any[]): number | null {
    if (!grow.lightWattage) return null;
    
    const baseEfficiency = {
      autoflower: 0.7,
      feminized: 1.0,
      regular: 0.9,
      clone: 1.1
    };
    
    const efficiency = baseEfficiency[grow.type] || 0.8;
    return Math.round(grow.lightWattage * efficiency);
  }
  
  private estimateDaysToHarvest(grow: any, entries: any[]): number | null {
    const currentWeek = entries.slice(-1)[0]?.week || 0;
    
    const floweringWeeks = {
      autoflower: 10,
      feminized: 9,
      regular: 10,
      clone: 8
    };
    
    const totalWeeks = floweringWeeks[grow.type] || 9;
    const remainingWeeks = Math.max(0, totalWeeks - currentWeek);
    
    return remainingWeeks * 7;
  }
  
  async getLeaderboard(options: {
    metric: 'efficiency' | 'yield' | 'likes';
    period?: 'week' | 'month' | 'alltime';
    limit?: number;
  }): Promise<any[]> {
    const limit = Math.min(options.limit || 100, 500);
    
    let query: any = { 
      status: 'harvested',
      deletedAt: { $exists: false },
      isPublic: true
    };
    
    if (options.period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query.harvestDate = { $gte: weekAgo };
    } else if (options.period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query.harvestDate = { $gte: monthAgo };
    }
    
    let sort: any = {};
    switch (options.metric) {
      case 'efficiency':
        query.efficiency = { $exists: true, $gt: 0 };
        sort = { efficiency: -1 };
        break;
      case 'yield':
        query.yieldDry = { $exists: true, $gt: 0 };
        sort = { yieldDry: -1 };
        break;
      case 'likes':
        sort = { likeCount: -1 };
        break;
    }
    
    const grows = await Grow.find(query)
      .sort(sort)
      .limit(limit)
      .select('userId strainName yieldDry efficiency likeCount harvestDate')
      .lean();
    
    return grows;
  }
}

export const statsService = new StatsService();
