// Contact.jsx
import React, { useEffect, useRef, useState } from 'react';
import './Contact.css';

const Contact = () => {
  const sectionsRef = useRef([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: 'general',
    message: ''
  });

  const [formStatus, setFormStatus] = useState({
    submitted: false,
    success: false,
    message: ''
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setFormStatus({ submitted: true, success: true, message: 'Thank you! We\'ll get back to you within 24 hours.' });
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      service: 'general',
      message: ''
    });
    
    // Reset success message after 5 seconds
    setTimeout(() => {
      setFormStatus({ submitted: false, success: false, message: '' });
    }, 5000);
  };

  return (
    <div className="contact-container">
      {/* Hero Section */}
      <section className="contact-hero" ref={(el) => (sectionsRef.current[0] = el)}>
        <div className="contact-overlay"></div>
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">
            <span className="contact-hero-subtitle">Get in Touch with</span>
            <span className="contact-company-name">ALL world Express</span>
          </h1>
          <p className="contact-hero-description">
            We're here to assist you 24/7. Reach out to us for any logistics needs, 
            inquiries, or support. Your satisfaction is our priority.
          </p>
          <div className="contact-hero-stats">
            <div className="contact-stat-item">
              <h3>24/7</h3>
              <p>Customer Support</p>
            </div>
            <div className="contact-stat-item">
              <h3>&lt; 1hr</h3>
              <p>Response Time</p>
            </div>
            <div className="contact-stat-item">
              <h3>150+</h3>
              <p>Countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="contact-info-section" ref={(el) => (sectionsRef.current[1] = el)}>
        <div className="section-header">
          <h2>Quick Connect</h2>
          <div className="underline"></div>
          <p className="section-subheader">Choose the best way to reach us</p>
        </div>

        <div className="info-cards-grid">
          <div className="info-card">
            <div className="info-icon">📍</div>
            <h3>Visit Us</h3>
            <p className="info-main">Global Headquarters</p>
            <p className="info-detail">123 Logistics Avenue, Business Bay<br />Dubai, UAE</p>
            <p className="info-note">Open: 24/7, 365 days</p>
          </div>

          <div className="info-card">
            <div className="info-icon">📞</div>
            <h3>Call Us</h3>
            <p className="info-main">24/7 Customer Support</p>
            <p className="info-detail">
              Toll-Free: +1-800-ALL-WORLD<br />
              International: +971-4-123-4567
            </p>
            <p className="info-note">Available in 12 languages</p>
          </div>

          <div className="info-card">
            <div className="info-icon">✉️</div>
            <h3>Email Us</h3>
            <p className="info-main">Quick Response Guaranteed</p>
            <p className="info-detail">
              General: info@allworldexpress.com<br />
              Support: help@allworldexpress.com<br />
              Sales: sales@allworldexpress.com
            </p>
            <p className="info-note">Avg. response: 30 minutes</p>
          </div>

          <div className="info-card">
            <div className="info-icon">💬</div>
            <h3>Live Chat</h3>
            <p className="info-main">Instant Support</p>
            <p className="info-detail">
              Chat with our experts<br />
              Available 24/7
            </p>
            <p className="info-note">
              <button className="chat-btn">Start Live Chat</button>
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="contact-form-section" ref={(el) => (sectionsRef.current[2] = el)}>
        <div className="section-header">
          <h2>Send Us a Message</h2>
          <div className="underline"></div>
          <p className="section-subheader">We'll get back to you within 24 hours</p>
        </div>

        <div className="form-map-container">
          <div className="contact-form-wrapper">
            {formStatus.submitted && formStatus.success && (
              <div className="success-message">
                <span className="success-icon">✓</span>
                <p>{formStatus.message}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="company">Company Name</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Enter your company name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="service">Service Interested In *</label>
                <select
                  id="service"
                  name="service"
                  value={formData.service}
                  onChange={handleInputChange}
                  required
                >
                  <option value="general">General Inquiry</option>
                  <option value="air-freight">Air Freight</option>
                  <option value="sea-freight">Sea Freight</option>
                  <option value="road-freight">Road Freight</option>
                  <option value="warehousing">Warehousing</option>
                  <option value="customs">Customs Clearance</option>
                  <option value="tracking">Shipment Tracking</option>
                  <option value="partnership">Partnership Opportunities</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Your Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows="6"
                  placeholder="Please describe your requirements or inquiry in detail..."
                ></textarea>
              </div>

              <div className="form-checkbox">
                <input type="checkbox" id="newsletter" name="newsletter" />
                <label htmlFor="newsletter">
                  Subscribe to our newsletter for logistics insights and updates
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Send Message
                  <span className="btn-icon">→</span>
                </button>
                <p className="form-note">* Required fields</p>
              </div>
            </form>
          </div>

          <div className="map-wrapper">
            <div className="map-container">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.1786539269264!2d55.27243731500973!3d25.19719698389618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f43348a67e24b%3A0xff45e502e1eb9d29!2sBurj%20Khalifa!5e0!3m2!1sen!2sae!4v1620000000000!5m2!1sen!2sae"
                title="ALL world Express Location"
                allowFullScreen=""
                loading="lazy"
                className="map-iframe"
              ></iframe>
              <div className="map-overlay-info">
                <h4>ALL world Express HQ</h4>
                <p>123 Logistics Avenue, Business Bay</p>
                <p>Dubai, United Arab Emirates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Hours Section */}
      <section className="hours-section" ref={(el) => (sectionsRef.current[3] = el)}>
        <div className="hours-content">
          <h2>We're Always Here for You</h2>
          <div className="hours-grid">
            <div className="hours-card">
              <h3>Customer Support</h3>
              <div className="hours-detail">
                <p>Monday - Friday</p>
                <p className="hours-time">24 Hours</p>
              </div>
              <div className="hours-detail">
                <p>Saturday - Sunday</p>
                <p className="hours-time">24 Hours</p>
              </div>
              <p className="hours-note">Round the clock support in 12 languages</p>
            </div>
            <div className="hours-card">
              <h3>Office Hours</h3>
              <div className="hours-detail">
                <p>Monday - Thursday</p>
                <p className="hours-time">8:00 AM - 8:00 PM</p>
              </div>
              <div className="hours-detail">
                <p>Friday</p>
                <p className="hours-time">8:00 AM - 12:00 PM</p>
              </div>
              <div className="hours-detail">
                <p>Saturday - Sunday</p>
                <p className="hours-time">Closed</p>
              </div>
              <p className="hours-note">Virtual meetings available on weekends</p>
            </div>
            <div className="hours-card emergency">
              <h3>Emergency Support</h3>
              <p className="emergency-phone">📞 +1-800-ALL-HELP</p>
              <p className="emergency-email">✉️ emergency@allworldexpress.com</p>
              <p className="hours-note">For urgent logistics issues only</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" ref={(el) => (sectionsRef.current[4] = el)}>
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <div className="underline"></div>
          <p className="section-subheader">Quick answers to common questions</p>
        </div>

        <div className="faq-grid">
          <div className="faq-item">
            <h3>❓ How quickly do you respond to inquiries?</h3>
            <p>We aim to respond to all inquiries within 1 hour during business hours and within 4 hours during off-hours. Urgent requests are prioritized immediately.</p>
          </div>
          <div className="faq-item">
            <h3>❓ Do you offer international shipping?</h3>
            <p>Yes! We operate in 150+ countries with comprehensive logistics solutions including air, sea, and road freight.</p>
          </div>
          <div className="faq-item">
            <h3>❓ Can I track my shipment in real-time?</h3>
            <p>Absolutely! Once your shipment is booked, you'll receive a tracking number and access to our real-time tracking portal.</p>
          </div>
          <div className="faq-item">
            <h3>❓ What languages do your support staff speak?</h3>
            <p>Our support team is multilingual, covering English, Arabic, Spanish, French, Mandarin, Hindi, and more.</p>
          </div>
        </div>
      </section>

      {/* Social Connect Section */}
      <section className="social-section" ref={(el) => (sectionsRef.current[5] = el)}>
        <div className="social-content">
          <h2>Connect With Us</h2>
          <p>Follow us on social media for updates, logistics tips, and industry news</p>
          <div className="social-icons">
            <a href="#" className="social-icon">📘</a>
            <a href="#" className="social-icon">🐦</a>
            <a href="#" className="social-icon">📸</a>
            <a href="#" className="social-icon">💼</a>
            <a href="#" className="social-icon">📱</a>
            <a href="#" className="social-icon">▶️</a>
          </div>
          <div className="social-note">
            <p>Tag us @allworldexpress for a chance to be featured!</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;