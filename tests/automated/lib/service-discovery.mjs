#!/usr/bin/env node
/**
 * Service Discovery — zentrale Container-IP-Auflösung
 * Extrahiert aus functional-tests.mjs und health-check.mjs
 */

import { execSync } from 'child_process';

/**
 * Docker-Container IP auflösen via docker inspect
 * @param {string} containerName - z.B. 'sf1-auth-service'
 * @returns {string|null} - IP-Adresse oder null
 */
export function getServiceIP(containerName) {
  try {
    const raw = execSync(`docker inspect ${containerName} 2>/dev/null`, { encoding: 'utf8' });
    const data = JSON.parse(raw);
    return Object.values(data[0].NetworkSettings.Networks)[0].IPAddress;
  } catch {
    return null;
  }
}

/**
 * Alle Service-URLs bauen
 * @returns {Object} - { auth, community, journal, price, search, tools, ai, gamification, backup, media, notification }
 */
export function buildBaseUrls() {
  const services = [
    { name: 'auth', container: 'sf1-auth-service', port: 3001 },
    { name: 'community', container: 'sf1-community-service', port: 3005 },
    { name: 'journal', container: 'sf1-journal-service', port: 3003 },
    { name: 'price', container: 'sf1-price-service', port: 3002 },
    { name: 'search', container: 'sf1-search-service', port: 3007 },
    { name: 'tools', container: 'sf1-tools-service', port: 3004 },
    { name: 'ai', container: 'sf1-ai-service', port: 3010 },
    { name: 'gamification', container: 'sf1-gamification-service', port: 3009 },
    { name: 'backup', container: 'sf1-backup', port: 3011 },
    { name: 'media', container: 'sf1-media-service', port: 3008 },
    { name: 'notification', container: 'sf1-notification-service', port: 3006 },
  ];

  const urls = {};
  for (const { name, container, port } of services) {
    const ip = getServiceIP(container);
    urls[name] = ip ? `http://${ip}:${port}` : null;
  }

  return urls;
}

/**
 * Prüfe ob Service erreichbar ist, wirft bei null IP
 * @param {string} serviceName - z.B. 'auth'
 * @param {string} url - z.B. 'http://172.28.0.11:3001'
 */
export function assertServiceReachable(serviceName, url) {
  if (!url) {
    throw new Error(`Service ${serviceName} nicht erreichbar (IP-Auflösung fehlgeschlagen)`);
  }
}

// Export als Singleton beim Import
export const BASE = buildBaseUrls();

// Validierung beim Start
for (const [name, url] of Object.entries(BASE)) {
  if (!url) {
    console.warn(`⚠️  Service ${name} nicht erreichbar`);
  }
}
