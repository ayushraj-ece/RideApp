'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { VehicleType } from '@/types/ride';
import { ShieldCheck, User, Mail, Phone, Lock, Bike, Car, ArrowRight } from 'lucide-react';

export default function CaptainRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('BIKE');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Sign up user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. Insert Profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          role: 'CAPTAIN',
          name,
          phone,
        });

        if (profileError) throw profileError;

        // 3. Insert Captain Details (Auto-APPROVED for MVP pilot)
        const { error: captainError } = await supabase.from('captains').insert({
          id: data.user.id,
          vehicle_type: vehicleType,
          vehicle_number: vehicleNumber.toUpperCase().trim(),
          vehicle_model: vehicleModel.trim(),
          license_number: licenseNumber.toUpperCase().trim(),
          verification_status: 'APPROVED',
          online_status: false,
          availability_status: 'AVAILABLE',
        });

        if (captainError) throw captainError;
      }

      router.push('/captain');
    } catch (err: any) {
      setError(err.message || 'Captain registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 font-black mb-4 shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Captain Registration</h1>
          <p className="text-sm text-slate-400 mt-1">Register your vehicle to start accepting rides</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Captain Rahul"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700/80 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700/80 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="captain@example.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700/80 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700/80 pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Select Vehicle Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVehicleType('BIKE')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  vehicleType === 'BIKE'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400 font-bold'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <Bike className="h-5 w-5 mb-1" />
                <span className="text-xs">Bike</span>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType('AUTO')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  vehicleType === 'AUTO'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400 font-bold'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <span className="text-lg mb-0.5">🛺</span>
                <span className="text-xs">Auto</span>
              </button>

              <button
                type="button"
                onClick={() => setVehicleType('CAB')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  vehicleType === 'CAB'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400 font-bold'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <Car className="h-5 w-5 mb-1" />
                <span className="text-xs">Cab</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Reg No.</label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="DL 01 AB 1234"
                className="w-full rounded-xl bg-slate-800 border border-slate-700/80 px-3 py-2 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Model</label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Splendor Plus"
                className="w-full rounded-xl bg-slate-800 border border-slate-700/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Driving License No.</label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="DL-1420110012345"
                className="w-full rounded-xl bg-slate-800 border border-slate-700/80 px-3 py-2 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-semibold text-slate-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering Captain...' : 'Register as Captain'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/captain/login" className="font-semibold text-amber-400 hover:underline">
            Captain Login
          </Link>
        </div>
      </div>
    </div>
  );
}
