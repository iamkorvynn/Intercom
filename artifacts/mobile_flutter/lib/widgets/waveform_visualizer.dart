import 'dart:math';
import 'package:flutter/material.dart';

class WaveformVisualizer extends StatefulWidget {
  final bool isActive;
  final Color color;

  const WaveformVisualizer({
    super.key,
    required this.isActive,
    required this.color,
  });

  @override
  State<WaveformVisualizer> createState() => _WaveformVisualizerState();
}

class _WaveformVisualizerState extends State<WaveformVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    if (widget.isActive) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant WaveformVisualizer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.isActive && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: const Size(double.infinity, 80),
          painter: _WaveformPainter(
            animationValue: _controller.value,
            isActive: widget.isActive,
            color: widget.color,
          ),
        );
      },
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double animationValue;
  final bool isActive;
  final Color color;

  _WaveformPainter({
    required this.animationValue,
    required this.isActive,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final double midY = size.height / 2;
    final int barCount = 41;
    final double spacing = size.width / (barCount - 1);

    for (int i = 0; i < barCount; i++) {
      final double x = i * spacing;
      
      // Calculate normal distribution shape (tapering at the edges)
      final double distanceFromCenter = (i - barCount / 2).abs() / (barCount / 2);
      final double envelope = exp(-distanceFromCenter * distanceFromCenter * 3);

      double height = 4.0; // Flat line height

      if (isActive) {
        // Compute wave with sine/cosine based on animation value and center distance
        final double phase = animationValue * 2 * pi;
        final double wave = sin(phase + i * 0.4) * cos(phase * 0.5 + i * 0.1);
        height = 4.0 + wave.abs() * (size.height - 10.0) * envelope;
      }

      canvas.drawLine(
        Offset(x, midY - height / 2),
        Offset(x, midY + height / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.isActive != isActive ||
        oldDelegate.color != color;
  }
}
