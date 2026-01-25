# HOI4 Resource Data Collection Guide

Since the Paradox Wiki is protected by Cloudflare and scraping isn't possible,
here's how to manually add resource data:

## Option 1: Manual Wiki Entry
1. Visit: https://hoi4.paradoxwikis.com/List_of_states
2. Find each state and note its resources
3. Add them to KNOWN_RESOURCE_STATES in the script

## Option 2: Use Game Files
If you know someone with HOI4 installed:
1. Copy the /history/states/ folder from their game
2. Send it to you
3. Run the script with that folder path

## Option 3: Community Data
Check these sources:
- Reddit r/hoi4
- HOI4 Discord communities
- GitHub repos with extracted data

## Current Resource Coverage
The script currently has partial data for:
- Major oil producers (Saudi Arabia, Texas, Iran, etc.)
- Major steel producers (Germany, USA, USSR)
- Chromium sources (South Africa, Balkans)
- Rubber producers (Southeast Asia)
- Tungsten sources (Spain, Portugal, China)
- Aluminium producers (Australia, USSR)

You'll need to add the remaining ~750 states manually or find a data source.