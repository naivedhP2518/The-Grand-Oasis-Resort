import { Component, OnInit, signal } from '@angular/core';
import { HotelService } from '../../services/hotel';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: false,
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot implements OnInit {
  isOpen = signal<boolean>(false);
  messages = signal<ChatMessage[]>([]);
  userInput = signal<string>('');
  isTyping = signal<boolean>(false);

  constructor(private hotelService: HotelService) {}

  ngOnInit(): void {
    // Restore session persistence
    try {
      const stored = sessionStorage.getItem('grand_oasis_chat_history');
      if (stored) {
        // Parse and restore timestamps correctly
        const parsed = JSON.parse(stored).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        this.messages.set(parsed);
      } else {
        // Welcome message
        this.messages.set([
          {
            role: 'model',
            text: 'Greetings from The Grand Oasis Resort! I am Antigravity, your personal guest relations concierge. How may I elevate your stay today?',
            timestamp: new Date()
          }
        ]);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  sendMessage() {
    const msg = this.userInput().trim();
    if (!msg) return;

    // Add user message to state
    const userMsg: ChatMessage = {
      role: 'user',
      text: msg,
      timestamp: new Date()
    };

    const currentMessages = [...this.messages(), userMsg];
    this.messages.set(currentMessages);
    this.userInput.set('');
    this.isTyping.set(true);

    // Persist
    this.saveHistory();

    // Call service
    const historyPayload = currentMessages.map(m => ({
      role: m.role,
      text: m.text
    }));

    this.hotelService.sendChatbotMessage(msg, historyPayload).subscribe({
      next: (res) => {
        // Simulate typing delay for a premium interactive feel
        setTimeout(() => {
          const modelMsg: ChatMessage = {
            role: 'model',
            text: res.reply,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, modelMsg]);
          this.isTyping.set(false);
          this.saveHistory();
        }, 800);
      },
      error: (err) => {
        console.error('Concierge chat error:', err);
        setTimeout(() => {
          const errMsg: ChatMessage = {
            role: 'model',
            text: 'My apologies, dear guest. It seems my connection was briefly interrupted. I am still here at your service. Please let me know how I may assist you.',
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, errMsg]);
          this.isTyping.set(false);
        }, 500);
      }
    });
  }

  saveHistory() {
    try {
      sessionStorage.setItem('grand_oasis_chat_history', JSON.stringify(this.messages()));
    } catch (e) {
      console.error(e);
    }
  }

  clearHistory() {
    sessionStorage.removeItem('grand_oasis_chat_history');
    this.messages.set([
      {
        role: 'model',
        text: 'Greetings from The Grand Oasis Resort! I am Antigravity, your personal guest relations concierge. How may I elevate your stay today?',
        timestamp: new Date()
      }
    ]);
  }
}
