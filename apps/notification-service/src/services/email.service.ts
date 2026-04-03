import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Notification } from '../models/Notification.model';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    this.loadTemplates();
  }
  
  /**
   * Load templates
   */
  private loadTemplates(): void {
    const templateDir = join(__dirname, '../templates/email');
    
    const templates = ['welcome', 'comment-reply', 'price-alert', 'digest', 'password-reset', 'verify-email', 'account-deleted'];
    
    for (const name of templates) {
      try {
        const source = readFileSync(join(templateDir, `${name}.hbs`), 'utf-8');
        this.templates.set(name, handlebars.compile(source));
      } catch (error) {
        logger.error(`[Email] Failed to load template ${name}:`, error);
      }
    }
  }
  
  /**
   * Send email
   */
  async send(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<boolean> {
    try {
      const tmpl = this.templates.get(options.template);
      
      if (!tmpl) {
        throw new Error(`Template ${options.template} not found`);
      }
      
      const html = tmpl(options.data);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'SF-1 <noreply@seedfinderpro.de>',
        to: options.to,
        subject: options.subject,
        html
      });
      
      logger.info(`[Email] Sent ${options.template} to ${options.to}`);
      
      return true;
    } catch (error) {
      logger.error(`[Email] Failed:`, error);
      return false;
    }
  }
  
  /**
   * Send notification email
   */
  async sendNotification(notificationId: string, userEmail: string): Promise<void> {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      logger.warn(`[Email] Notification ${notificationId} not found`);
      return;
    }
    
    const templateMap: Record<string, string> = {
      comment: 'comment-reply',
      reply: 'comment-reply',
      mention: 'comment-reply',
      price_alert: 'price-alert'
    };
    
    const template = templateMap[notification.type] || 'generic';
    
    const success = await this.send({
      to: userEmail,
      subject: notification.title,
      template,
      data: {
        title: notification.title,
        message: notification.message,
        url: notification.relatedUrl ? `https://seedfinderpro.de${notification.relatedUrl}` : null,
        ...notification.data
      }
    });
    
    await Notification.updateOne(
      { _id: notificationId },
      { 'deliveryStatus.email': success ? 'sent' : 'failed' }
    );
  }

  /**
   * Send contact form email to admin
   */
  async sendContactForm(options: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'klingenpascal@gmail.com';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Neue Kontaktanfrage — SeedFinderPro</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight:bold; width:100px;">Name:</td><td style="padding: 8px;">${options.name}</td></tr>
          <tr><td style="padding: 8px; font-weight:bold;">E-Mail:</td><td style="padding: 8px;"><a href="mailto:${options.email}">${options.email}</a></td></tr>
          <tr><td style="padding: 8px; font-weight:bold;">Betreff:</td><td style="padding: 8px;">${options.subject || '(kein Betreff)'}</td></tr>
        </table>
        <hr style="margin: 16px 0;" />
        <p style="white-space: pre-wrap;">${options.message}</p>
        <hr style="margin: 16px 0;" />
        <p style="color: #999; font-size: 12px;">Gesendet über das Kontaktformular auf seedfinderpro.de</p>
      </div>
    `;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'SF-1 <noreply@seedfinderpro.de>',
        to: adminEmail,
        replyTo: options.email,
        subject: `[Kontakt] ${options.subject || options.name}`,
        html,
      });
      logger.info(`[Email] Contact form from ${options.email}`);
      return true;
    } catch (error) {
      logger.error('[Email] Contact form failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();