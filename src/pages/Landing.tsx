import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Wallet,
  Briefcase,
  Star,
  Shield,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Briefcase,
      title: 'Find Work',
      description: 'Browse hundreds of micro-tasks and earn money from the comfort of your home',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: TrendingUp,
      title: 'Track Earnings',
      description: 'Real-time tracking of your earnings and work progress',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Wallet,
      title: 'Fast Payments',
      description: 'Get paid instantly after completing tasks',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Your data and payments are protected with bank-level security',
      color: 'from-amber-500 to-orange-500'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '50K+', label: 'Tasks Completed' },
    { value: '₹5M+', label: 'Paid to Workers' },
    { value: '24/7', label: 'Support Available' }
  ];

  const testimonials = [
    {
      name: 'Rahul Sharma',
      role: 'Freelancer',
      content: 'I\'ve earned over ₹50,000 in just 3 months. This platform has changed my life!',
      rating: 5
    },
    {
      name: 'Priya Patel',
      role: 'Student',
      content: 'Perfect for earning extra money during college breaks. Simple tasks, quick payments.',
      rating: 5
    },
    {
      name: 'Vikram Singh',
      role: 'Part-time Worker',
      content: 'The best micro-task platform I\'ve used. Reliable payments and great support team.',
      rating: 5
    }
  ];

  const steps = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create your free account in less than 2 minutes'
    },
    {
      step: 2,
      title: 'Complete Tasks',
      description: 'Browse and complete simple micro-tasks'
    },
    {
      step: 3,
      title: 'Earn Money',
      description: 'Get paid instantly to your wallet'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5"></div>
          <div className="container mx-auto px-4 py-20 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-2" />
                India's #1 Micro-Task Platform
              </Badge>
              <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6">
                Earn Money by Completing <span className="text-primary">Simple Tasks</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join thousands of Indians earning money online. Complete micro-tasks from anywhere, anytime. 
                Get paid instantly with secure transactions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=register">
                  <Button size="lg" className="gap-2 text-lg px-8 py-6">
                    Start Earning Now
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/campaigns">
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
                    Browse Work
                    <Briefcase className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Getting started is simple. Follow these 3 easy steps to start earning money today.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <Card key={index} className="p-6 hover:shadow-xl transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white text-2xl font-bold mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">
                Why Choose Us?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We provide the best platform for earning money online with features that make your experience seamless.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 hover:shadow-xl transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">
                What Our Users Say
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of satisfied users who are earning money with our platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of Indians who are earning money online with our platform. 
            Sign up today and start earning in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=register">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100 gap-2 text-lg px-8 py-6">
                Get Started Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 gap-2 text-lg px-8 py-6">
                Learn More
                <Info className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);
};

export default Landing;