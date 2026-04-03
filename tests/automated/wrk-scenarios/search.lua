-- wrk Szenario: Suchmaschinen-Last
-- Simuliert Nutzer die intensiv nach Strains suchen

math.randomseed(os.time())

local queries = {
  "northern+lights", "white+widow", "ak-47", "cannabis+sativa",
  "indoor+strain", "outdoor+grow", "autoflowering", "feminized",
  "high+thc", "cbd+strain", "amnesia", "skunk", "haze", "kush",
}

request = function()
  local q = queries[math.random(#queries)]
  local types = { "strains", "posts", "users" }
  local t = types[math.random(#types)]
  local path = "/api/search?q=" .. q .. "&type=" .. t
  return wrk.format("GET", path, {
    ["Accept"] = "application/json",
    ["User-Agent"] = "SF1-LoadTest/1.0",
  })
end

response = function(status, headers, body)
  if status >= 500 then
    io.write("Search Error: " .. status .. "\n")
  end
end

done = function(summary, latency, requests)
  io.write("\n--- Search Szenario Zusammenfassung ---\n")
  io.write(string.format("Requests:    %d\n", summary.requests))
  io.write(string.format("Fehler:      %d\n", summary.errors.status))
  io.write(string.format("Avg Latenz:  %.2fms\n", latency.mean / 1000))
  io.write(string.format("P95 Latenz:  %.2fms\n", latency:percentile(95) / 1000))
end
