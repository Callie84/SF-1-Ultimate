// Unit Tests für VPD Calculator
describe('VPD Calculator', () => {
  // VPD Berechnung: (1 - RH/100) * SVP
  // SVP = 0.6108 * e^(17.27 * T / (T + 237.3))

  const calculateVPD = (temperature: number, humidity: number): number => {
    // Saturated Vapor Pressure (SVP)
    const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));

    // Vapor Pressure Deficit
    const vpd = (1 - humidity / 100) * svp;

    return Math.round(vpd * 100) / 100;
  };

  describe('calculateVPD', () => {
    it('should calculate VPD for seedling stage', () => {
      // Seedling: 20-25°C, 65-70% RH → VPD ~0.4-0.8 kPa
      const vpd = calculateVPD(22, 68);

      expect(vpd).toBeGreaterThan(0.3);
      expect(vpd).toBeLessThan(0.9);
    });

    it('should calculate VPD for vegetative stage', () => {
      // Vegetative: 22-28°C, 60-70% RH → VPD ~0.8-1.2 kPa
      const vpd = calculateVPD(25, 65);

      expect(vpd).toBeGreaterThan(0.7);
      expect(vpd).toBeLessThan(1.3);
    });

    it('should calculate VPD for flowering stage', () => {
      // Flowering: 20-26°C, 45-55% RH → VPD ~1.0-1.5 kPa
      const vpd = calculateVPD(24, 50);

      expect(vpd).toBeGreaterThan(0.9);
      expect(vpd).toBeLessThan(1.6);
    });

    it('should handle extreme temperatures', () => {
      const vpdHot = calculateVPD(35, 50);
      const vpdCold = calculateVPD(15, 50);

      expect(vpdHot).toBeGreaterThan(vpdCold);
      expect(vpdHot).toBeGreaterThan(0);
      expect(vpdCold).toBeGreaterThan(0);
    });

    it('should handle extreme humidity', () => {
      const vpdDry = calculateVPD(25, 20);
      const vpdHumid = calculateVPD(25, 90);

      expect(vpdDry).toBeGreaterThan(vpdHumid);
      expect(vpdDry).toBeGreaterThan(0);
      expect(vpdHumid).toBeGreaterThan(0);
    });

    it('should return 0 at 100% humidity', () => {
      const vpd = calculateVPD(25, 100);

      expect(vpd).toBe(0);
    });

    it('should be consistent across calculations', () => {
      const vpd1 = calculateVPD(25, 60);
      const vpd2 = calculateVPD(25, 60);

      expect(vpd1).toBe(vpd2);
    });
  });

  describe('getVPDRecommendation', () => {
    const getRecommendation = (vpd: number): string => {
      if (vpd < 0.4) return 'TOO_LOW';
      if (vpd < 0.8) return 'SEEDLING';
      if (vpd < 1.2) return 'VEGETATIVE';
      if (vpd < 1.6) return 'FLOWERING';
      return 'TOO_HIGH';
    };

    it('should recommend seedling range', () => {
      expect(getRecommendation(0.5)).toBe('SEEDLING');
      expect(getRecommendation(0.7)).toBe('SEEDLING');
    });

    it('should recommend vegetative range', () => {
      expect(getRecommendation(0.9)).toBe('VEGETATIVE');
      expect(getRecommendation(1.1)).toBe('VEGETATIVE');
    });

    it('should recommend flowering range', () => {
      expect(getRecommendation(1.3)).toBe('FLOWERING');
      expect(getRecommendation(1.5)).toBe('FLOWERING');
    });

    it('should warn about too low VPD', () => {
      expect(getRecommendation(0.2)).toBe('TOO_LOW');
    });

    it('should warn about too high VPD', () => {
      expect(getRecommendation(1.8)).toBe('TOO_HIGH');
    });
  });
});
