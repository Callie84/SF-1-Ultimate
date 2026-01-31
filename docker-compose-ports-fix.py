import yaml

# Lade YAML
with open('docker-compose.yml', 'r') as f:
    data = yaml.safe_load(f)

# Entferne nur die exposed ports
services_to_fix = ['postgres', 'mongodb', 'redis', 'meilisearch', 'traefik']

for service in services_to_fix:
    if service in data.get('services', {}):
        if 'ports' in data['services'][service]:
            # Ports komplett entfernen (außer bei traefik)
            if service == 'traefik':
                data['services'][service]['ports'] = ['80:80']
            else:
                del data['services'][service]['ports']

# Speichern
with open('docker-compose.yml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
print("YAML repariert!")
