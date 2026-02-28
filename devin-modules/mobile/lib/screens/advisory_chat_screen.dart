import 'package:flutter/material.dart';
import '../services/advisory_service.dart';
import '../models/farm_identity.dart';

class AdvisoryChatScreen extends StatefulWidget {
  final FarmIdentity? farm;
  final String? existingChatId;

  const AdvisoryChatScreen({super.key, this.farm, this.existingChatId});

  @override
  State<AdvisoryChatScreen> createState() => _AdvisoryChatScreenState();
}

class _AdvisoryChatScreenState extends State<AdvisoryChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AdvisoryService _advisoryService = AdvisoryService();
  
  List<ChatMessage> _messages = [];
  String? _chatId;
  bool _isLoading = false;
  String _language = 'en';

  @override
  void initState() {
    super.initState();
    _chatId = widget.existingChatId;
    if (_chatId != null) _loadExistingChat();
  }

  Future<void> _loadExistingChat() async {
    try {
      final chat = await _advisoryService.getChat(_chatId!);
      if (chat != null && mounted) {
        setState(() {
          _messages = (chat['messages'] as List)
              .map((m) => ChatMessage(
                    role: m['role'],
                    content: m['content'],
                    timestamp: DateTime.parse(m['timestamp']),
                  ))
              .toList();
        });
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint('Load chat error: $e');
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isLoading) return;

    _messageController.clear();
    setState(() {
      _messages.add(ChatMessage(role: 'user', content: text, timestamp: DateTime.now()));
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final response = await _advisoryService.sendMessage(
        message: text,
        chatId: _chatId,
        farmId: widget.farm?.id,
        language: _language,
      );

      if (mounted) {
        setState(() {
          _chatId = response['chat_id'];
          _messages.add(ChatMessage(
            role: 'assistant',
            content: response['response'],
            timestamp: DateTime.now(),
            actions: List<String>.from(response['suggested_actions'] ?? []),
          ));
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            role: 'assistant',
            content: 'Connection error. Please try again.',
            timestamp: DateTime.now(),
          ));
          _isLoading = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agrivision Advisor'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.language),
            onSelected: (lang) => setState(() => _language = lang),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'en', child: Text('English')),
              const PopupMenuItem(value: 'fr', child: Text('Français')),
              const PopupMenuItem(value: 'ar', child: Text('العربية')),
              const PopupMenuItem(value: 'tr', child: Text('Türkçe')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Farm context banner
          if (widget.farm != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFFE8F5E9),
              child: Row(
                children: [
                  const Icon(Icons.agriculture, color: Color(0xFF2E7D32), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${widget.farm!.farmName} — ${widget.farm!.primaryCrops.join(", ")}',
                      style: const TextStyle(color: Color(0xFF2E7D32), fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

          // Messages list
          Expanded(
            child: _messages.isEmpty
                ? _buildWelcome()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length) return _buildTypingIndicator();
                      return _buildMessageBubble(_messages[index]);
                    },
                  ),
          ),

          // Input field
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, -2))],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: _language == 'fr' ? 'Posez votre question...' : 'Ask your question...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                      maxLines: 3,
                      minLines: 1,
                    ),
                  ),
                  const SizedBox(width: 8),
                  FloatingActionButton.small(
                    onPressed: _isLoading ? null : _sendMessage,
                    backgroundColor: const Color(0xFF1B5E20),
                    child: const Icon(Icons.send, color: Colors.white, size: 18),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcome() {
    final quickQuestions = _language == 'fr'
        ? ['Comment prévenir le mildiou?', 'Quand irriguer mes tomates?', 'Maladies du blé au Québec']
        : ['How to prevent blight?', 'When to irrigate tomatoes?', 'Common wheat diseases'];

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.smart_toy, size: 64, color: Colors.green.shade200),
            const SizedBox(height: 16),
            Text(
              _language == 'fr' ? 'Votre conseiller agricole IA' : 'Your AI Farm Advisor',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            ...quickQuestions.map((q) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: OutlinedButton(
                onPressed: () {
                  _messageController.text = q;
                  _sendMessage();
                },
                style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF2E7D32)),
                child: Text(q),
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    final isUser = msg.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: isUser ? const Color(0xFF1B5E20) : const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isUser ? const Radius.circular(4) : null,
            bottomLeft: !isUser ? const Radius.circular(4) : null,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SelectableText(
              msg.content,
              style: TextStyle(color: isUser ? Colors.white : Colors.black87, fontSize: 15),
            ),
            if (msg.actions != null && msg.actions!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Wrap(
                  spacing: 6,
                  children: msg.actions!.map((a) => Chip(
                    label: Text(a.replaceAll('_', ' '), style: const TextStyle(fontSize: 11)),
                    backgroundColor: const Color(0xFFE8F5E9),
                    visualDensity: VisualDensity.compact,
                  )).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) => Padding(
            padding: EdgeInsets.only(left: i > 0 ? 4 : 0),
            child: const SizedBox(
              width: 8, height: 8,
              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2E7D32)),
            ),
          )),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}

class ChatMessage {
  final String role;
  final String content;
  final DateTime timestamp;
  final List<String>? actions;

  ChatMessage({required this.role, required this.content, required this.timestamp, this.actions});
}
