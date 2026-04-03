-- wrk Szenario: Anonymes Feed-Browsing
-- Simuliert Nutzer die durch den Community-Feed scrollen

math.randomseed(os.time())

local endpoints = {
  "/api/community/threads?limit=10",
  "/api/community/threads?limit=20",
  "/api/community/threads?limit=10&page=2",
  "/api/community/threads?limit=5&page=3",
}

request = function()
  local path = endpoints[math.random(#endpoints)]
  return wrk.format("GET", path, {
    ["Accept"] = "application/json",
    ["User-Agent"] = "SF1-LoadTest/1.0",
  })
end

response = function(status, headers, body)
  if status >= 500 then
    io.write("Server Error: " .. status .. "\n")
  end
end

done = function(summary, latency, requests)
  io.write("\n--- Feed Szenario Zusammenfassung ---\n")
  io.write(string.format("Requests:    %d\n", summary.requests))
  io.write(string.format("Fehler:      %d\n", summary.errors.status + summary.errors.connect + summary.errors.read + summary.errors.write))
  io.write(string.format("Avg Latenz:  %.2fms\n", latency.mean / 1000))
  io.write(string.format("P95 Latenz:  %.2fms\n", latency:percentile(95) / 1000))
  io.write(string.format("P99 Latenz:  %.2fms\n", latency:percentile(99) / 1000))
end
