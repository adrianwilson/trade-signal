import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  activeTab = 0;

  submit(): void {
    this.error.set('');
    this.loading.set(true);

    const action =
      this.activeTab === 0
        ? this.authService.login(this.email, this.password)
        : this.authService.register(this.email, this.password);

    action.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/signals']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.error?.message ?? 'Authentication failed. Please try again.',
        );
      },
    });
  }
}
