---
title: Seekrieg – Schiffe, Häfen und Docks
description: "Schritt-für-Schritt: vom ersten Hafen bis zur blockierten See."
order: 4
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Seekrieg – Schiffe, Häfen und Docks

> **Interaktiv lernen:** [Flotten-Tutorial jetzt starten](/navy?tutorial=navy) – die Anleitung führt Sie Schritt für Schritt durch die echten Bedienelemente.

Das **Navy**-Console (`/navy`) ist die Kommandozentrale für alles, was auf dem
Wasser passiert. Die Welt ist dort in ein Sechskant-Raster (Hexfelder) unterteilt.
Ein Zug dauert je nach Schiff ein bis mehrere Stunden; der Cron
`/api/cron/fleet` rückt alle 15 Minuten einen Schritt weiter.

<Mermaid
  label="Vom Hafen zum einsatzbereiten Schiff"
  chart={"flowchart LR\n  K[Küstenregion] -->|1 Hafen pro Region| H[Hafen in der EEZ]\n  H -->|Dock bauen| D[Dock mit Baubays]\n  D -->|Auftrag in Queue| Q[Schiff im Bau]\n  Q -->|Cron-Tick| S[Einsatzbereites Schiff]\n  S -->|Move + Zielhex| F[Hex-Bewegung]\n  S -->|Sonar/SAR| I[Seeaufklärung]"}
/>

![Hex-Meer mit EEZ, Hafen, Schiff und Minenfeld](/images/docs/hex-sea.svg)

## 1. Küste finden

Öffnen Sie die [Karte](/map) und schalten Sie in den **See-Modus**. Nur Küsten-
regionen (Gelände „Küste") und die See sind sichtbar; Binnenregionen werden
ausgeblendet. Jede Küstenregion beansprucht eine **EEZ** – zwei Hex-Ringe
Offshorewasser, die bis zur echten Küstenlinie zugeschnitten sind.

Klicken Sie auf ein Hex, sehen Sie dessen EEZ-Eigentümer, Schiffe, Minen und
Hafen. Über „Open in fleet console" landen Sie direkt im Navy-Console.

## 2. Hafen bauen

Im Navy-Console wählen Sie unten im Panel **Port errichten** und eine eigene
Küstenregion. Es gibt **genau einen Hafen pro Region**; er entsteht auf dem
nächstgelegenen freien Hex innerhalb ihrer EEZ. Ein Hafen:

- speichert Treibstoff (wird langsam aus der militärischen Reserve aufgefüllt),
- lagert Fracht zum Be- und Entladen,
- lässt sich mit **Hafen erweitern** bis Stufe 5 ausbauen (mehr Tankkapazität).

## 3. Dock bauen und ausbauen

Im selben Panel klicken Sie auf **Dock bauen**. Ein Dock hat Baubays in Höhe
seiner Stufe (maximal 4). Jede weitere Stufe kostet mehr Geld und Stahl, dafür
laufen mehr Aufträge gleichzeitig und Reparaturen gehen schneller.

## 4. Schiffe bestellen

Wählen Sie im **Shipyard** ein Dock und einen Schiffstyp. Der Auftrag wandert in
die Warteschlange; sobald ein Bay frei ist, beginnt der Bau. Wenn der Timer
abläuft, erscheint das Schiff mit voller Rumpfstärke und Treibstoff im Hafen.

| Klasse | Aufgabe |
| --- | --- |
| Flugzeugträger | Jagdflugzeuge, grosse Reichweite |
| Fregatte | VLS, kann Minen legen |
| Helipad-Kreuzer | U-Boot-Jagd mit Hubschraubern |
| Versorger / Tanker | Treibstoff auf See weitergeben |
| Korvette / Zerstörer / leichte Flak | Geleitschutz, VLS, Luftabwehr |
| Torpedo-/VLS-U-Boot | getarnt, Torpedos oder Lenkflugkörper |
| Container / Ro-Ro / Tanker | Fracht zwischen Häfen transportieren |

## 5. Schiffe bewegen

Wählen Sie ein Schiff auf der Karte oder in der Flottenliste und klicken Sie auf
**Move**; danach klicken Sie auf ein Zielhex. Das Schiff legt pro Takt ein Hex
zurück und verbraucht Treibstoff. Mit **Hold** brechen Sie den Auftrag ab.
Zivile Schiffe umgehen feindliche Minenfelder; Kriegsschiffe fahren hindurch,
nehmen aber Schaden.

## 6. Versorgen und Fracht

Steht das Schiff im eigenen Hafen, können Sie **Refuel** klicken. Frachtschiffe
laden und entladen Waren mit dem Formular „Goods / Amount / Load–Unload".
Tanker und Versorger können benachbarte Schiffe ausserdem auf See betanken.

## 7. Minen und Blockade

<Mermaid
  label="Wie eine Blockade entsteht"
  chart={"flowchart TD\n  M[Minenschiff im Hex] -->|Lay mines| F[Minefeld 48 h]\n  F --> Z{Zivil oder Kriegsschiff?}\n  Z -->|zivil| S[Passage verweigert — Hafen blockiert]\n  Z -->|Kriegsschiff| D[Schaden beim Einlaufen]\n  D -->|Stärke aufgebraucht| X[Minefeld verschwindet]"}
/>

Schiffe mit Minenlegeschutz (Fregatte, U-Boot) können **Lay mines** auf ihrem
aktuellen Hex ausführen. Zivile Schiffe weigern sich, ein vermintes Hex zu
passieren – ein Ring um einen Hafen blockiert ihn. Kriegsschiffe, die hindurch
fahren, erleiden Schaden. Minen verfallen nach 48 Stunden.

## 8. GNSS-Störung

GNSS-Jamming kann aus drei Domänen kommen: ein Störschiff auf See, eine
Flugabwehr-Einheit an Land oder Jagdflugzeuge mit EW-Pods in der Luft. Alle
feindlichen Sender in Reichweite addieren sich pro Hex. Ein gestörtes Schiff
fährt langsamer und trifft seltener. Die Stärke sehen Sie auf der Schiffskarte.

## 9. Seeaufklärung

Wählen Sie ein Hex und starten Sie unter **Sea intel** einen Sonar-, Radar-
oder SAR-Durchgang. Sonar findet U-Boote, Radar und SAR sehen Oberflächenschiffe
und Minen. Berichte verfallen nach 12 Stunden und bestimmen auf der Karte,
welche feindlichen Schiffe sichtbar sind.

## 10. Weiter geht es

Luftwaffe und direkte Einsätze sind in [Luftwaffe und Einsätze](/docs/air)
beschrieben; die Kartenmodus-Details in [Karte und Luftraum](/docs/map-modes).
