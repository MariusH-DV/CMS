[connection]
id=cms-wifi
uuid={{NM_UUID}}
type=wifi
autoconnect=true
autoconnect-priority=100

[wifi]
mode=infrastructure
ssid={{SSID}}

[wifi-security]
key-mgmt=wpa-psk
psk={{WIFI_PASSWORD}}

[ipv4]
method=auto

[ipv6]
method=auto
addr-gen-mode=default
