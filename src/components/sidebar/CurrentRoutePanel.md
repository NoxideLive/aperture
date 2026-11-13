## CurrentRoutePanel.tsx

**Purpose:** Experimental Current Route grid panel — live active route, followers, remaining hop breadcrumb.
**File:** `src/components/sidebar/CurrentRoutePanel.tsx`

**Props:** `activeRoute`, `viewData`, `primaryCharacterId`, optional `onSetRoute`, optional `onHopClick` — re-pushes k-space waypoints from the remaining leg; hop markers match `RouteHopBreadcrumb` in the Routes panel.

### Behaviour
- `remainingActiveRouteHops` trims passed hops from the stored plan using waypoint cursor and primary pilot presence (full route, not on-map-only).
- Layout mirrors a Routes `DestinationRow` (bordered block, hop strip, link-style waypoint refresh).
