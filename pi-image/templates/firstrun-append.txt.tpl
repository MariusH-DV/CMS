Anleitung: Oeffne die Datei "cmdline.txt" im Wurzelverzeichnis des Boot-Laufwerks mit
einem einfachen Texteditor. Sie besteht aus EINER einzigen Zeile. Haenge an das ENDE
dieser Zeile (durch ein Leerzeichen getrennt, keine neue Zeile!) folgenden Text an:

systemd.run=/boot/firmware/cms-provisioning/firstrun.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target

Hinweis: Aktuelle Raspberry Pi OS Versionen (Bookworm und neuer) haengen die
Boot-Partition unter /boot/firmware ein, aeltere Versionen (Bullseye und
frueher) unter /boot. Falls der Pi mit der obigen Zeile nicht startet und du
eine aeltere Raspberry-Pi-OS-Version verwendest, ersetze in der Zeile
"/boot/firmware/cms-provisioning/" durch "/boot/cms-provisioning/".
