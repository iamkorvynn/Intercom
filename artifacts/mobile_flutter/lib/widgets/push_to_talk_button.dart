import 'package:flutter/material.dart';

class PushToTalkButton extends StatefulWidget {
  final bool isTransmitting;
  final bool isMuted;
  final VoidCallback onPressStart;
  final VoidCallback onPressEnd;

  const PushToTalkButton({
    super.key,
    required this.isTransmitting,
    required this.isMuted,
    required this.onPressStart,
    required this.onPressEnd,
  });

  @override
  State<PushToTalkButton> createState() => _PushToTalkButtonState();
}

class _PushToTalkButtonState extends State<PushToTalkButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.92).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _glowAnimation = Tween<double>(begin: 8.0, end: 24.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    if (widget.isTransmitting) {
      _animationController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant PushToTalkButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isTransmitting && !_animationController.isAnimating) {
      _animationController.repeat(reverse: true);
    } else if (!widget.isTransmitting && _animationController.isAnimating) {
      _animationController.stop();
      _animationController.reverse();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color buttonColor = widget.isMuted
        ? Colors.grey[800]!
        : (widget.isTransmitting ? const Color(0xFF00FF41) : const Color(0xFF1E1E1E));
    
    final Color iconColor = widget.isMuted
        ? Colors.grey[500]!
        : (widget.isTransmitting ? Colors.black : const Color(0xFF00FF41));

    final Color glowColor = widget.isMuted
        ? Colors.transparent
        : const Color(0xFF00FF41).withOpacity(widget.isTransmitting ? 0.4 : 0.1);

    return ScaleTransition(
      scale: _scaleAnimation,
      child: Listener(
        onPointerDown: (_) {
          if (!widget.isMuted) {
            widget.onPressStart();
          }
        },
        onPointerUp: (_) {
          if (!widget.isMuted) {
            widget.onPressEnd();
          }
        },
        onPointerCancel: (_) {
          if (!widget.isMuted) {
            widget.onPressEnd();
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 200,
          height: 200,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: buttonColor,
            boxShadow: [
              BoxShadow(
                color: glowColor,
                blurRadius: _animationController.isAnimating ? _glowAnimation.value : 12.0,
                spreadRadius: _animationController.isAnimating ? _glowAnimation.value / 4 : 2.0,
              ),
            ],
            border: Border.all(
              color: widget.isMuted
                  ? Colors.grey[700]!
                  : const Color(0xFF00FF41).withOpacity(widget.isTransmitting ? 1.0 : 0.4),
              width: 4.0,
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  widget.isMuted
                      ? Icons.mic_off
                      : (widget.isTransmitting ? Icons.record_voice_over : Icons.mic),
                  size: 64,
                  color: iconColor,
                ),
                const SizedBox(height: 8),
                Text(
                  widget.isMuted
                      ? 'MUTED'
                      : (widget.isTransmitting ? 'TRANSMITTING' : 'HOLD TO TALK'),
                  style: TextStyle(
                    color: iconColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
