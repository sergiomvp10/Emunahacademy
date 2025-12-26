import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, BookOpen, 
  ChevronDown, ChevronUp, CheckCircle, Send, Menu, X
} from 'lucide-react';

interface SiteContent {
  hero: {
    title: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
  };
  about: {
    title: string;
    description: string;
    mission: string;
    vision: string;
  };
  how_it_works: {
    title: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  programs: {
    title: string;
    subtitle: string;
    grades: Array<{ level: string; name: string; description: string }>;
  };
  impact: {
    title: string;
    stats: Array<{ number: string; label: string }>;
  };
  faq: {
    title: string;
    questions: Array<{ question: string; answer: string }>;
  };
  contact: {
    title: string;
    email: string;
    phone: string;
    address: string;
  };
}

const GRADE_OPTIONS = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
];

export function LandingPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    student_age: '',
    grade_level: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    address: '',
    message: ''
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await api.getSiteContent() as unknown as SiteContent;
      setContent(data);
    } catch (error) {
      console.error('Error loading site content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitApplication({
        student_name: formData.student_name,
        student_age: parseInt(formData.student_age),
        grade_level: formData.grade_level,
        parent_name: formData.parent_name,
        parent_email: formData.parent_email,
        parent_phone: formData.parent_phone,
        address: formData.address || undefined,
        message: formData.message || undefined
      });
      setApplicationSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Error loading content</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-teal-500 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-800">Emunah Academy</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-teal-600 transition-colors">About</button>
              <button onClick={() => scrollToSection('programs')} className="text-gray-600 hover:text-teal-600 transition-colors">Programs</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-teal-600 transition-colors">How It Works</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-teal-600 transition-colors">FAQ</button>
              <Link to="/login">
                <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50">
                  Sign In
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('about')} className="block w-full text-left text-gray-600 hover:text-teal-600">About</button>
              <button onClick={() => scrollToSection('programs')} className="block w-full text-left text-gray-600 hover:text-teal-600">Programs</button>
              <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-gray-600 hover:text-teal-600">How It Works</button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-gray-600 hover:text-teal-600">FAQ</button>
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full border-teal-500 text-teal-600">Sign In</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-teal-500 via-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {content.hero.title}
              </h1>
              <p className="text-lg md:text-xl text-teal-100 mb-8">
                {content.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-teal-600 hover:bg-teal-50"
                  onClick={() => scrollToSection('apply')}
                >
                  {content.hero.cta_primary}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white bg-transparent hover:bg-white/10 [&]:text-white"
                  onClick={() => scrollToSection('about')}
                >
                  {content.hero.cta_secondary}
                </Button>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                  <GraduationCap className="h-48 w-48 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {content.impact.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-teal-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.about.title}</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">{content.about.description}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Our Mission</h3>
                <p className="text-gray-600">{content.about.mission}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Our Vision</h3>
                <p className="text-gray-600">{content.about.vision}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.how_it_works.title}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {content.how_it_works.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.programs.title}</h2>
            <p className="text-lg text-gray-600">{content.programs.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.programs.grades.map((grade, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="text-sm text-teal-600 font-medium mb-1">{grade.level}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{grade.name}</h3>
                  <p className="text-gray-600 text-sm">{grade.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 bg-gradient-to-br from-teal-500 to-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl">
            <CardContent className="p-8">
              {applicationSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Application Submitted!</h3>
                  <p className="text-gray-600 text-lg">
                    We have received your application and will contact you soon.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Apply Now</h2>
                    <p className="text-gray-600">Fill out the form below to start your child's educational journey</p>
                  </div>
                  <form onSubmit={handleSubmitApplication} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="student_name">Student Name *</Label>
                        <Input
                          id="student_name"
                          value={formData.student_name}
                          onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                          required
                          placeholder="Enter student's full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student_age">Student Age *</Label>
                        <Input
                          id="student_age"
                          type="number"
                          min="4"
                          max="18"
                          value={formData.student_age}
                          onChange={(e) => setFormData({ ...formData, student_age: e.target.value })}
                          required
                          placeholder="Enter age"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="grade_level">Grade Level *</Label>
                      <Select
                        value={formData.grade_level}
                        onValueChange={(value) => setFormData({ ...formData, grade_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((grade) => (
                            <SelectItem key={grade.value} value={grade.value}>
                              {grade.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                        <Input
                          id="parent_name"
                          value={formData.parent_name}
                          onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                          required
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_email">Email Address *</Label>
                        <Input
                          id="parent_email"
                          type="email"
                          value={formData.parent_email}
                          onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                          required
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="parent_phone">Phone Number *</Label>
                        <Input
                          id="parent_phone"
                          type="tel"
                          value={formData.parent_phone}
                          onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                          required
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="message">Additional Information (Optional)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us anything else you'd like us to know"
                        rows={3}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      disabled={submitting || !formData.student_name || !formData.student_age || !formData.grade_level || !formData.parent_name || !formData.parent_email || !formData.parent_phone}
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Submit Application
                        </span>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.faq.title}</h2>
          </div>
          <div className="space-y-4">
            {content.faq.questions.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <span className="font-medium text-gray-800">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-500 p-2 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl">Emunah Academy</span>
              </div>
              <p className="text-gray-400 mb-4">
                Empowering vulnerable communities through quality education.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">About Us</button></li>
                <li><button onClick={() => scrollToSection('programs')} className="hover:text-white transition-colors">Programs</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">FAQ</button></li>
                <li><button onClick={() => scrollToSection('apply')} className="hover:text-white transition-colors">Apply Now</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{content.contact.title}</h4>
              <ul className="space-y-2 text-gray-400">
                {content.contact.email && <li>{content.contact.email}</li>}
                {content.contact.phone && <li>{content.contact.phone}</li>}
                {content.contact.address && <li>{content.contact.address}</li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Emunah Academy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
