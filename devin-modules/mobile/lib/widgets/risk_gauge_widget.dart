import 'dart:math' as math;
import 'package:flutter/material.dart';

// ============================================================
// RISK GAUGE WIDGET — Circular risk indicator
// ============================================================
class RiskGaugeWidget extends StatelessWidget {
  final String label;
  final double value; // 0.0 to 1.0
  final IconData icon;

  const RiskGaugeWidget({super.key, required this.label, required this.value, required this.icon});

  Color get _color => value > 0.7 ? Colors.red : value > 0.4 ? Colors.orange : const Color(0xFF2E7D32);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 56, height: 56,
            child: CustomPaint(
              painter: _GaugePainter(value: value, color: _color),
              child: Center(child: Icon(icon, color: _color, size: 22)),
            ),
          ),
          const SizedBox(height: 6),
          Text('${(value * 100).toStringAsFixed(0)}%',
            style: TextStyle(fontWeight: FontWeight.bold, color: _color, fontSize: 14)),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double value;
  final Color color;
  _GaugePainter({required this.value, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 4;

    // Background arc
    final bgPaint = Paint()
      ..color = Colors.grey.shade200
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi * 0.75, math.pi * 1.5, false, bgPaint);

    // Value arc
    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi * 0.75, math.pi * 1.5 * value.clamp(0.0, 1.0), false, fgPaint);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) => old.value != value || old.color != color;
}
