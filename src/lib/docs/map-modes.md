---
title: Karte und Luftraum
description: See-, Land- und Luftmodus nutzen und Hexfelder auswählen.
order: 6
---

# Karte und Luftraum

Die [Karte](/map) hat links oben drei Modi. Jeder Modus zeigt eine andere
Sicht auf dieselbe Welt.

## Naval-Modus (See)

- Zeigt nur das Meer und die Küstenregionen. Binnenregionen werden stark
  ausgeblendet, Landeinheiten, Schlachten und Heeresaufklärung sind verborgen.
- Die Sechskante liegen **innerhalb der EEZ** der Küstenstaaten und werden an
  der echten Küstenlinie abgeschnitten – es gibt keine Hexfelder auf Land.
- Häfen (⚓), Schiffe und Minen (✳) sitzen auf ihren Hexfeldern.
- Ein Klick auf ein Hex öffnet ein Panel mit Koordinaten, EEZ-Eigentümer,
  Hafen, Schiffen und Minen sowie einem Link ins Navy-Console.

## Land-Modus

- Zeigt Regionen, Heeres- und Luftstreitkräfte, Schlachten, Aufklärung und
  Luftangriffe wie gehabt.
- Die See-Overlays sind ausgeblendet.

## Aerial-Modus (Luft)

- Mehrere Hexfelder und die Regionen darüber werden zu einem **Luftraum**
  (`LR-A1` bis `LR-C4`) gruppiert.
- Jeder Sektor zeigt die Anzahl Regionen, Schiffe und einsatzbereiter Flugzeuge.
- Nutzen Sie die Sektoren, um Luftoperationen zu planen – Details in
  [Luftwaffe und Einsätze](/docs/air).

## Hex auswählen

1. Schalten Sie auf **Naval** oder **Aerial**.
2. Klicken Sie auf ein Hex (nicht auf eine Region).
3. Das Panel zeigt die Koordinaten `q,r`, die EEZ-Zugehörigkeit und alle
   Kontakte auf diesem Feld.
4. „Open in fleet console →" öffnet `/navy?hex=q,r` mit vorausgewähltem Hex.
   Dort können Sie Seeaufklärung starten, Schiffe hinschicken oder Minen legen.

## Tipp: Fog of War

Feindliche Schiffe erscheinen auf der Karte nur, wenn ein frischer
Seeaufklärungsbericht (Sonar, Radar, SAR oder Luftaufklärung) ihr Hex in den
letzten 12 Stunden gesehen hat. Ohne Aufklärung ist die See „blank".
