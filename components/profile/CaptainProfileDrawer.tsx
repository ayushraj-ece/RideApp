'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, Bike, Car, ShieldCheck, Sun, Moon, Check, Edit2, Loader2 } from 'lucide-react';
import { UserProfile, CaptainProfile, VehicleType } from '@/types/ride';
import { createClient } from '@/lib/supabase/client';

interface CaptainProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  captain: CaptainProfile | null;
  onUpdate: (updatedProfile: UserProfile, updatedCaptain: CaptainProfile) => void;
}

export default function CaptainProfileDrawer({
  isOpen,
  onClose,
  profile,
  captain,
  onUpdate,
}: CaptainProfileDrawerProps) {
  const supabase = createClient();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(captain?.vehicle_type || 'BIKE');
  const [vehicleNumber, setVehicleNumber] = useState(captain?.vehicle_number || '');
  const [vehicleModel, setVehicleModel] = useState(captain?.vehicle_model || '');
  const [licenseNumber, setLicenseNumber] = useState(captain?.license_number || '');
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  if (!isOpen || !profile || !captain) return null;

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Profiles table
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ name, phone })
        .eq('id', profile.id);

      if (pErr) throw pErr;

      // 2. Update Captains table
      const { error: cErr } = await supabase
        .from('captains')
        .update({
          vehicle_type: vehicleType,
          vehicle_number: vehicleNumber,
          vehicle_model: vehicleModel,
          license_number: licenseNumber,
        })
        .eq('id', captain.id);

      if (cErr) throw cErr;

      const updatedProf: UserProfile = { ...profile, name, phone };
      const updatedCapt: CaptainProfile = {
        ...captain,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        vehicle_model: vehicleModel,
        license_number: licenseNumber,
      };

      onUpdate(updatedProf, updatedCapt);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update captain profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200 dark:border-slate-800">
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-bold">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Captain Profile</h2>
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                  RIDEON CAPTAIN
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* VERIFICATION BADGE */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="h-5 w-5" />
              <span>Verified Captain Account</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
              APPROVED
            </span>
          </div>

          {/* PERSONAL DETAILS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Personal Details</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {profile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Email Address</label>
                <p className="font-bold text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {profile.email}
                </p>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Phone Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {profile.phone || '+91 98765 43210'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* VEHICLE DETAILS SECTION */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Vehicle Details</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Vehicle Category</label>
                {isEditing ? (
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none"
                  >
                    <option value="BIKE">Bike</option>
                    <option value="AUTO">Auto</option>
                    <option value="CAB">Cab / Car</option>
                  </select>
                ) : (
                  <p className="font-extrabold text-amber-500 text-sm bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {captain.vehicle_type}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Vehicle Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none"
                    />
                  ) : (
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {captain.vehicle_number}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Vehicle Model</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none"
                    />
                  ) : (
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 truncate">
                      {captain.vehicle_model}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* THEME TOGGLE */}
          <div className="pt-2">
            <button
              onClick={toggleTheme}
              className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-4 w-4 text-amber-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <span>Appearance Mode</span>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {theme} Mode
              </span>
            </button>
          </div>
        </div>

        {/* SAVE BUTTONS */}
        {isEditing && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="w-1/2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-1/2 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
