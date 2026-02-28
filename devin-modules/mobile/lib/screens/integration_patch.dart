// ═══════════════════════════════════════════════════════════════
// INTEGRATION PATCH — Add Mode A/B to existing AgriVision app
// ═══════════════════════════════════════════════════════════════
//
// FILE 1: lib/screens/mode_control_screen.dart
//   → Copy mode_control_screen.dart into your lib/screens/ folder
//
// FILE 2: lib/config/router.dart
//   → Add this import at the top:
//     import '../screens/mode_control_screen.dart';
//
//   → Add this route (after /reports route):
//     GoRoute(path: '/mode', builder: (_, __) => const ModeControlScreen()),
//
// FILE 3: lib/screens/home_screen.dart
//   → Add this widget to the top of the dashboard body
//     (paste inside the Column/ListView, above the stats grid)

// ─── HOME SCREEN: Mode Quick-Toggle Widget ───
// Add this as first item in home dashboard

/*
  PASTE THIS into home_screen.dart's main list/column,
  right before the stats grid:
*/

// --- START PASTE ---

// import '../screens/mode_control_screen.dart';
// import 'package:go_router/go_router.dart';

class ModeQuickToggle extends StatefulWidget {
  const ModeQuickToggle({super.key});
  @override
  State<ModeQuickToggle> createState() => _ModeQuickToggleState();
}

class _ModeQuickToggleState extends State<ModeQuickToggle> {
  bool _isCCTV = false; // false = Mode B (Monitoring), true = Mode A (CCTV)

  @override
  Widget build(BuildContext context) {
    final color = _isCCTV ? const Color(0xFFEF4444) : const Color(0xFF16A34A);
    final icon = _isCCTV ? Icons.videocam_rounded : Icons.eco_rounded;
    final modeLabel = _isCCTV ? 'MODE A — CCTV' : 'MODE B — MONITORING';
    final modeDesc = _isCCTV
        ? 'Live surveillance • Motion alerts • Recording'
        : 'AI Detection • Time-lapse • Scheduled capture';

    return GestureDetector(
      onTap: () => context.push('/mode'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withOpacity(0.08), color.withOpacity(0.02)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Row(children: [
          // Mode icon
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 12),
          // Mode info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(modeLabel,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.3)),
            const SizedBox(height: 2),
            Text(modeDesc, style: TextStyle(fontSize: 11, color: color.withOpacity(0.7))),
          ])),
          // Toggle + arrow
          Column(children: [
            // Mini A/B toggle
            GestureDetector(
              onTap: () => setState(() => _isCCTV = !_isCCTV),
              child: Container(
                width: 56, height: 28,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: color.withOpacity(0.15),
                  border: Border.all(color: color.withOpacity(0.3)),
                ),
                child: Stack(children: [
                  // Labels
                  Row(children: [
                    Expanded(child: Center(child: Text('A',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800,
                            color: _isCCTV ? Colors.white : color.withOpacity(0.4))))),
                    Expanded(child: Center(child: Text('B',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800,
                            color: !_isCCTV ? Colors.white : color.withOpacity(0.4))))),
                  ]),
                  // Sliding dot
                  AnimatedAlign(
                    duration: const Duration(milliseconds: 200),
                    alignment: _isCCTV ? Alignment.centerLeft : Alignment.centerRight,
                    child: Container(
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle, color: color,
                        boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 4)],
                      ),
                      child: Center(child: Text(_isCCTV ? 'A' : 'B',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white))),
                    ),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 4),
            Icon(Icons.tune_rounded, size: 14, color: color.withOpacity(0.5)),
          ]),
        ]),
      ),
    );
  }
}

// --- END PASTE ---

// Then in home_screen.dart's build method, add:
//   const ModeQuickToggle(),
// as the first widget in the scrollable body.


// ─── SETTINGS SCREEN: Mode Control Link ───
// Add this tile to settings_screen.dart's list:

/*
  ListTile(
    leading: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(
        color: const Color(0xFF16A34A).withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(Icons.tune_rounded, color: Color(0xFF16A34A), size: 20),
    ),
    title: const Text('System Mode (A/B)', style: TextStyle(fontWeight: FontWeight.w600)),
    subtitle: const Text('CCTV vs Monitoring • Time-lapse • Schedule'),
    trailing: const Icon(Icons.chevron_right),
    onTap: () => context.push('/mode'),
  ),
*/


// ─── NAVBAR OPTION (Alternative): Replace Map tab with Mode ───
// If you want Mode in the bottom nav instead of as a settings link:
//
// In router.dart's ShellRoute, replace the /map route:
//   GoRoute(path: '/mode', builder: (_, __) => const ModeControlScreen()),
//
// In router.dart's _AppShell, update:
//   BottomNavigationBarItem(icon: Icon(Icons.tune_rounded), label: 'Mode'),
