Anleitung: Oeffne die Datei "cmdline.txt" im Wurzelverzeichnis des Boot-Laufwerks mit
einem einfachen Texteditor. Sie besteht aus EINER einzigen Zeile. Haenge an das ENDE
dieser Zeile (durch ein Leerzeichen getrennt, keine neue Zeile!) folgenden Text an:

systemd.run=/boot/cms-provisioning/firstrun.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target
