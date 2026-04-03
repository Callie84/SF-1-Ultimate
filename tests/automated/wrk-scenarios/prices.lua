-- wrk Szenario: Preisdaten-Abruf
-- Simuliert Nutzer die Preise vergleichen

math.randomseed(os.time())

local endpoints = {
  "/api/prices/browse?limit=10",
  "/api/prices/browse?limit=20",
  "/api/prices/trending",
  "/api/prices/search?q=northern+lights",
  "/api/prices/search?q=white+widow",
  "/api/prices/search?q=cannabis",
  "/api/prices/today",
  "/api/prices/seed/northern-lights",
  "/api/prices/seed/white-widow",
  "/api/prices/seed/ak-47",
}

request = function()
  local path = endpoints[math.random(#endpoints)]
  return wrk.format("GET", path, {
    ["Accept"] = "application/json",
    ["User-Agent"] = "SF1-LoadTest/1.0",
  })
end

done = function(summary, latency, requests)
  io.write("\n--- Prices Szenario Zusammenfassung ---\n")
  io.write(string.format("Requests:    %d\n", summary.requests))
  io.write(string.format("Fehler:      %d\n", summary.errors.status))
  io.write(string.format("Avg Latenz:  %.2fms\n", latency.mean / 1000))
  io.write(string.format("P95 Latenz:  %.2fms\n", latency:percentile(95) / 1000))
end
