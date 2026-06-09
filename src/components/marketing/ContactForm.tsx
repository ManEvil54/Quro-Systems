'use client';

import React, { useState } from 'react';
import { User, Mail, Building2, Phone, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    phone: '',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validations
    if (!formData.name.trim()) {
      setStatus('error');
      setErrorMessage('Please provide your name.');
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setStatus('error');
      setErrorMessage('Please provide a valid work email address.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit contact request:', err);
      setStatus('error');
      setErrorMessage('Failed to connect to the server. Please check your network connection.');
    }
  };

  if (status === 'success') {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-50/60 backdrop-blur-xl border border-teal-100/80 rounded-[3rem] p-10 md:p-16 text-center shadow-[0_32px_64px_-24px_rgba(13,148,136,0.08)] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-8 text-teal-600 border border-teal-100 shadow-inner animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-3xl font-extralight text-slate-900 mb-4 tracking-tight">
          Request Received
        </h3>
        <p className="text-slate-500 font-light leading-relaxed max-w-md mx-auto mb-8">
          Thank you, <span className="font-normal text-slate-800">{formData.name}</span>. We have saved your request and sent a notification to our team. A clinical solutions specialist will reach out to <span className="font-normal text-teal-600">{formData.email}</span> shortly.
        </p>
        <button
          onClick={() => {
            setFormData({ name: '', email: '', organization: '', phone: '', message: '' });
            setStatus('idle');
          }}
          className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200/50 hover:bg-teal-100 rounded-2xl transition-all"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-50/40 backdrop-blur-xl border border-slate-200/50 rounded-[3rem] p-8 md:p-14 shadow-[0_48px_96px_-32px_rgba(15,23,42,0.05)] relative overflow-hidden transition-all duration-500 hover:shadow-[0_48px_96px_-24px_rgba(15,23,42,0.08)]">
      {/* Background soft glow inside card */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-center md:text-left mb-10">
          <h3 className="text-3xl font-extralight tracking-tight text-slate-900 mb-3">
            Request a Live Demo
          </h3>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            Fill out the form below. We will coordinate a custom sandbox environment mapped directly to your facility specifications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {status === 'error' && (
            <div className="p-4 bg-red-50/80 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-[10px] font-black tracking-widest text-slate-400 uppercase block ml-1">
                Full Name <span className="text-teal-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-teal-500 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  placeholder="Evelyn Carter, RN"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={status === 'submitting'}
                  className="w-full pl-11 pr-4 py-4 bg-white/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-black tracking-widest text-slate-400 uppercase block ml-1">
                Work Email <span className="text-teal-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-teal-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  placeholder="ecarter@hospital.org"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={status === 'submitting'}
                  className="w-full pl-11 pr-4 py-4 bg-white/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Organization / Facility */}
            <div className="space-y-2">
              <label htmlFor="organization" className="text-[10px] font-black tracking-widest text-slate-400 uppercase block ml-1">
                Organization / Facility
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-teal-500 transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="organization"
                  id="organization"
                  placeholder="Cascade Gardens Care Center"
                  value={formData.organization}
                  onChange={handleChange}
                  disabled={status === 'submitting'}
                  className="w-full pl-11 pr-4 py-4 bg-white/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-[10px] font-black tracking-widest text-slate-400 uppercase block ml-1">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-teal-500 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="(555) 019-2834"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={status === 'submitting'}
                  className="w-full pl-11 pr-4 py-4 bg-white/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Message / Requirements */}
          <div className="space-y-2">
            <label htmlFor="message" className="text-[10px] font-black tracking-widest text-slate-400 uppercase block ml-1">
              Message / Specific Requirements
            </label>
            <div className="relative group">
              <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none text-slate-300 group-focus-within:text-teal-500 transition-colors">
                <MessageSquare className="w-4 h-4" />
              </div>
              <textarea
                name="message"
                id="message"
                rows={4}
                placeholder="Tell us about your organization (e.g. bed count, EHR systems you use, timelines)..."
                value={formData.message}
                onChange={handleChange}
                disabled={status === 'submitting'}
                className="w-full pl-11 pr-4 py-4 bg-white/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all resize-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-teal-600 focus:bg-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 active:scale-98 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                  <span>Processing Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                  <span>Submit Demo Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
