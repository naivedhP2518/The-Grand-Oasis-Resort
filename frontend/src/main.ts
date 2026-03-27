import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app-module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch((err: any) => console.error(err));

// Custom Cursor Logic
document.addEventListener('DOMContentLoaded', () => {
  const cursor = document.querySelector('.custom-cursor') as HTMLElement;
  const dot = document.querySelector('.custom-cursor-dot') as HTMLElement;

  if (!cursor || !dot) return;

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';

    const target = e.target as HTMLElement;
    const isHoverable = target.closest('a, button, .luxury-link, .cursor-pointer, [role="button"]');
    
    if (isHoverable) {
      cursor.classList.add('cursor-hover');
    } else {
      cursor.classList.remove('cursor-hover');
    }
  });
});
