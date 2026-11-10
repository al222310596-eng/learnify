"""
Mide CPU y RAM de tu computadora mientras corre la prueba y lo guarda en un CSV.
Uso:  python monitor_recursos.py 300      (300 = segundos que va a medir)
Déjalo corriendo en OTRA terminal mientras Locust trabaja.
"""
import csv, sys, time
from datetime import datetime
import psutil

duracion = int(sys.argv[1]) if len(sys.argv) > 1 else 300

with open("recursos.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["hora", "cpu_%", "ram_%", "ram_usada_MB"])
    for _ in range(duracion):
        cpu = psutil.cpu_percent(interval=1)          # tarda 1 s en medir
        ram = psutil.virtual_memory()
        w.writerow([datetime.now().strftime("%H:%M:%S"), cpu, ram.percent,
                    round(ram.used / 1024 / 1024)])
        f.flush()
        print(f"CPU {cpu:5.1f}% | RAM {ram.percent:5.1f}%")
print("Listo -> recursos.csv")