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
    
    const templates = ['welcome', 'comment-reply', 'price-alert', 'digest', 'password-reset'];
    
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
}

export const emailService = new EmailService();