---
title: Luftwaffe und Einsätze
description: Flugzeuge ausbilden, Treibstoff und Erfahrung nutzen und Einsätze beauftragen.
order: 5
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Luftwaffe und Einsätze

> **Interaktiv lernen:** [Luftwaffen-Tutorial jetzt starten](/navy?tutorial=air) – die Anleitung führt Sie durch Geschwader, Einsätze und Ziele.

Die Luftwaffe wird unter **Forces** (/training) ausgebildet und im Navy-Console
unter **Air operations** gesteuert. Jedes Geschwader hat eine Rolle, verbraucht
Treibstoff und sammelt Erfahrung.

<Mermaid
  label="Lebenszyklus eines Einsatzes"
  chart={"flowchart LR\n  T[Forces: Geschwader trainieren] --> E[Erfahrung + Treibstoff]\n  E --> A[Air operations: Aufgabe wählen]\n  A --> R{Rolle passt?}\n  R -->|nein| X[abgelehnt]\n  R -->|ja| L[Launch mission — Treibstoff sofort weg]\n  L --> C[Cron: Flugzeit abwarten]\n  C --> W[Wirkung + Erfahrungsgewinn]"}
/>

![Luftraum-Sektoren auf der Karte](/images/docs/luftraum.svg)

## 1. Geschwader ausbilden

Auf der Seite **Forces** wählen Sie einen der folgenden Typen. Die Ausbildung
dauert mehrere Stunden und kostet Geld und Material.

| Typ | Rolle | Was er kann |
| --- | --- | --- |
| Transportflugzeug | Airlift | Truppen und Versorgung between Regionen |
| Bomber | Strategische Bombardierung | Industrie und Infrastruktur einer Region |
| Tanker | Luftbetankung | Treibstoff an Schiffe/Hex oder Einheiten |
| Fighterjet | Lufthoheit | Abfangen feindlicher Flugzeuge |
| Close air support | Nahunterstützung | Entlastet Fronten im Gefecht |
| Naval bomber | Seezielbekämpfung | Greift Schiffe von Küstenflugplätzen an |
| Helikopter | Utility / U-Boot-Jagd | Kleine Lasten, beste ASW-Wirkung |

## 2. Treibstoff und Erfahrung

- **Treibstoff** wird beim Gefecht und bei Einsätzen verbraucht. Ein leeres
  Geschwader kämpft nur noch mit halber Kraft. Der Cron füllt Tanks aus der
  staatlichen militärischen Reserve langsam wieder auf; die Anzeige in
  **Forces** zeigt den aktuellen Stand (FUEL-Balken).
- **Erfahrung** steigt durch Übungen (+10) und durch jeden Einsatz, in dem das
  Geschwader Feuer erhalten hat. Erfahrene Besatzungen richten mehr Schaden an
  (Rekrut 1,0 → Elite 1,2). Verluste im Gefecht kosten Erfahrung.

## 3. Einsatz beauftragen

Im Navy-Console öffnen Sie **Air operations**:

1. Geschwader auswählen (mit Treibstoff- und Erfahrungsanzeige),
2. Einsatzart wählen,
3. Ziel auswählen – Regionen per Dropdown, Seeziele per Hex auf der Karte,
4. **Launch mission** klicken.

Der Einsatz braucht die passende Rolle. Ein Fighterjet kann z. B. keine
strategische Bombardierung fliegen. Der Treibstoff wird sofort abgezogen, die
Wirkung tritt ein, wenn der Flugtimer abläuft.

| Einsatz | Ziel | Wirkung |
| --- | --- | --- |
| Strategic bombing | Region | Infrastruktur und Wirtschaft sinken |
| Logistic strike | Region | Versorgung 12 h lang gekürzt |
| Naval bombing | Hex | feindliches Schiff im Hex wird beschädigt |
| Airlift | eigene Region | Versorgungsschub 12 h |
| Reconnaissance | Hex | Seeaufklärungsbericht mit Kontakten und Minen |
| Refuel | eigene Region | Schiffe im Hafenhex werden betankt |
| Battlefield support | Region | Versorgung 6 h lang entlastet |

<Mermaid
  label="Rolle bestimmt den Einsatz"
  chart={"flowchart TD\n  B[Bomber] --> SB[Strategic bombing]\n  B --> LS[Logistic strike]\n  N[Naval bomber / Helikopter] --> NB[Naval bombing]\n  N --> ASW[U-Boot-Jagd auf See]\n  TR[Transportflugzeug] --> AL[Airlift]\n  TK[Tanker] --> RF[Refuel]\n  F[Fighterjet] --> AO[Air superiority]\n  CS[Close air support] --> BS[Battlefield support]\n  H[Helikopter · utility] --> RC[Reconnaissance]"}
/>

## 4. Luftraum auf der Karte

Im **Aerial**-Modus der [Karte](/map) werden mehrere Hexfelder und die Regionen
darüber zu einem **Luftraum** (LR-A1 …) zusammengefasst. Die Beschriftung zeigt
Regionen, Schiffe und einsatzbereite Flugzeuge pro Sektor.

## 5. Typische Einstiegsroute

1. Zuerst ein Tanker- und ein Transportgeschwader ausbilden.
2. Seeaufklärung über einem Hex starten (`sonar` für U-Boote).
3. Naval bomber gegen das entdeckte Schiff schicken.
4. Nach dem Gefecht Treibstoff auffüllen und Erfahrung prüfen.
5. Minen legen, um feindliche Frachtschiffe an der Einfahrt zu hindern.
