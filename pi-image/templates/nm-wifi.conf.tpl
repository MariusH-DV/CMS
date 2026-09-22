[connection]
id=cms-wifi
uuid={{NM_UUID}}
type=wifi
autoconnect=true
autoconnect-priority=100

[wifi]
mode=infrastructure
ssid={{SSID}}
# Stromsparmodus abschalten (2 = aus) - fuer einen Dauerbetrieb-Kiosk
# wichtiger als Energieersparnis, verhindert gelegentliche WLAN-Aussetzer.
powersave=2

[wifi-security]
key-mgmt=wpa-psk
psk={{WIFI_PASSWORD}}

[ipv4]
method=auto

[ipv6]
method=auto
addr-gen-mode=default
