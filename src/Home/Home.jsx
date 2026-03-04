// Home.jsx
import React, { useEffect, useRef } from 'react';
import './Home.css';

const Home = () => {
  const sectionsRef = useRef([]);

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

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section" ref={(el) => (sectionsRef.current[0] = el)}>
        <div className="overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-subtitle">Welcome to</span>
            <span className="company-name">ALL World Express</span>
          </h1>
          <p className="hero-description">
            Your Trusted Partner in Global Logistics & Supply Chain Solutions
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <h3>150+</h3>
              <p>Countries Served</p>
            </div>
            <div className="stat-item">
              <h3>25K+</h3>
              <p>Happy Clients</p>
            </div>
            <div className="stat-item">
              <h3>50K+</h3>
              <p>Deliveries Daily</p>
            </div>
          </div>
          <button className="cta-button">Track Your Shipment</button>
        </div>
      </section>

      {/* Trust & Goodwill Section */}
      <section className="trust-section" ref={(el) => (sectionsRef.current[1] = el)}>
        <div className="section-header">
          <h2>Building Trust, Delivering Excellence</h2>
          <div className="underline"></div>
        </div>
        
        <div className="trust-content">
          <div className="trust-text">
            <p className="trust-paragraph">
              At <strong>ALL world Express</strong>, we believe that logistics is more than just moving packages from point A to point B. It's about building lasting relationships based on trust, reliability, and mutual growth. For over two decades, we've been the backbone of global commerce, connecting businesses and communities across borders with unwavering commitment.
            </p>
            
            <p className="trust-paragraph">
              Our journey began with a simple vision: to create a logistics network that puts people first. Today, that vision has evolved into a global movement where every package carries not just products, but promises, dreams, and aspirations. We understand that when you entrust us with your shipments, you're entrusting us with your reputation and business success.
            </p>

            <div className="goodwill-box">
              <h3>Our Commitment to Stakeholders</h3>
              <div className="goodwill-grid">
                <div className="goodwill-item">
                  <div className="goodwill-icon">🤝</div>
                  <h4>For Our Clients</h4>
                  <p>We promise transparency, reliability, and personalized solutions that adapt to your unique business needs. Your success is our success.</p>
                </div>
                <div className="goodwill-item">
                  <div className="goodwill-icon">👥</div>
                  <h4>For Our Employees</h4>
                  <p>We foster a culture of respect, growth, and innovation. Our team members are family, and their wellbeing is paramount to our success.</p>
                </div>
                <div className="goodwill-item">
                  <div className="goodwill-icon">🌍</div>
                  <h4>For Our Community</h4>
                  <p>We're committed to sustainable practices and giving back to the communities we serve, ensuring a better tomorrow for generations to come.</p>
                </div>
              </div>
            </div>

            <p className="trust-paragraph emphasis">
              "Trust is not just our policy; it's our promise. Every day, our 10,000+ dedicated employees work tirelessly to ensure that your shipments arrive safely, on time, and with the care they deserve. We've built our reputation on this foundation, and we'll continue to earn your trust with every delivery we make."
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section" ref={(el) => (sectionsRef.current[2] = el)}>
        <div className="section-header">
          <h2>Why Choose ALL World Express?</h2>
          <div className="underline"></div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>Global Network</h3>
            <p>Extensive coverage across 150+ countries with local expertise and global standards</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Tracking</h3>
            <p>Advanced tracking technology providing end-to-end visibility of your shipments</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Handling</h3>
            <p>State-of-the-art security protocols ensuring your cargo's safety at every step</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💚</div>
            <h3>Eco-friendly</h3>
            <p>Sustainable logistics solutions minimizing environmental impact</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>24/7 Support</h3>
            <p>Round-the-clock customer service to address your needs anytime, anywhere</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Custom Solutions</h3>
            <p>Tailored logistics strategies designed for your specific business requirements</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" ref={(el) => (sectionsRef.current[3] = el)}>
        <div className="section-header">
          <h2>What Our Clients Say</h2>
          <div className="underline"></div>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-text">
              "ALL world Express has transformed our supply chain. Their reliability and attention to detail are unmatched. They're not just a vendor; they're a true partner in our growth."
            </p>
            <div className="testimonial-author">
              <strong>Sarah Johnson</strong>
              <p>CEO, Global Trade Solutions</p>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">
              "The team at ALL world Express goes above and beyond. Their commitment to customer satisfaction and employee wellbeing is truly inspiring. Proud to be associated with them."
            </p>
            <div className="testimonial-author">
              <strong>Michael Chen</strong>
              <p>Operations Director, Tech Innovations Inc.</p>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">
              "Five years and counting with ALL world Express. Their consistent service quality and innovative solutions have helped us expand to 30+ countries seamlessly."
            </p>
            <div className="testimonial-author">
              <strong>Priya Patel</strong>
              <p>Founder, Artisan Collective</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" ref={(el) => (sectionsRef.current[4] = el)}>
        <div className="cta-content">
          <h2>Ready to Experience the ALL world Express Difference?</h2>
          <p>Join thousands of satisfied clients who trust us with their logistics needs</p>
          <div className="cta-buttons">
            <button className="cta-button primary">Get Started Today</button>
            <button className="cta-button secondary">Contact Our Team</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;