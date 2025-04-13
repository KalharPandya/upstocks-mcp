import ngrok from 'ngrok';
import config from '../config/config';
import { EventEmitter } from 'events';

/**
 * Tunnel manager for creating public URLs using ngrok
 */
export class TunnelManager extends EventEmitter {
  private url: string | null = null;
  private isActive = false;

  constructor() {
    super();
  }

  /**
   * Get the current public URL
   */
  public getUrl(): string | null {
    return this.url;
  }

  /**
   * Check if tunnel is active
   */
  public isConnected(): boolean {
    return this.isActive;
  }

  /**
   * Start ngrok tunnel
   */
  public async start(): Promise<string> {
    if (this.isActive) {
      return this.url!;
    }

    try {
      const port = config.server.port;

      console.info(`Starting ngrok tunnel to port ${port}...`);
      this.url = await ngrok.connect({
        addr: port,
        region: 'us',
        onStatusChange: (status) => {
          console.info(`Ngrok tunnel status: ${status}`);
        },
        onLogEvent: (log) => {
          if (config.server.logLevel === 'debug') {
            console.debug(`Ngrok log: ${log}`);
          }
        }
      });

      this.isActive = true;
      console.info(`Ngrok tunnel established: ${this.url}`);

      this.emit('connected', this.url);
      return this.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to start ngrok tunnel: ${errorMessage}`);
      this.isActive = false;
      this.url = null;
      throw error;
    }
  }

  /**
   * Stop ngrok tunnel
   */
  public async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      await ngrok.kill();
      this.isActive = false;
      this.url = null;
      console.info('Ngrok tunnel closed');
      this.emit('disconnected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to stop ngrok tunnel: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get a full URL for a specific path
   */
  public getUrlForPath(path: string): string | null {
    if (!this.url) {
      return null;
    }

    // Ensure path starts with /
    const normPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.url}${normPath}`;
  }

  /**
   * Get a callback URL for Upstox OAuth
   */
  public getCallbackUrl(): string | null {
    return this.getUrlForPath('/callback');
  }

  /**
   * Get a webhook URL for order updates
   */
  public getWebhookUrl(): string | null {
    return this.getUrlForPath('/webhook');
  }

  /**
   * Get a notifier URL for access token notifications
   */
  public getNotifierUrl(): string | null {
    return this.getUrlForPath('/notifier');
  }
}

// Export a singleton instance
export const tunnelManager = new TunnelManager();
