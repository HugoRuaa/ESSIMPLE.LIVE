import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Camera,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Contact } from '../../types';

export const PanelContacts: React.FC = () => {
  const {
    stagedContacts,
    hasContactChanges,
    saveContactChanges,
    discardContactChanges,
    updateStagedContacts,
    addContact,
    editContact,
    deleteContact,
    reorderContact,
    settings,
  } = useApp();

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for modal [28]
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | undefined>();
  const [formEmergency, setFormEmergency] = useState(true);
  const [formSafeZone, setFormSafeZone] = useState(false);
  const [formLowBattery, setFormLowBattery] = useState(true);

  const emergencyCount = stagedContacts.filter(c => c.isEmergency).length;
  const totalCount = stagedContacts.length;

  const handleOpenAdd = () => {
    if (totalCount >= 20) {
      alert('Has alcanzado el límite máximo de 20 contactos.');
      return;
    }
    setFormName('');
    setFormPhone('');
    setFormPhoto(undefined);
    setFormEmergency(true);
    setFormSafeZone(false);
    setFormLowBattery(false);
    setIsAddingNew(true);
    setEditingContact(null);
  };

  const handleOpenEdit = (contact: Contact) => {
    setFormName(contact.name);
    // strip country code for cleaner edit if present
    const rawPhone = contact.phone.replace(/^\+\d+\s*/, '');
    setFormPhone(rawPhone);
    setFormPhoto(contact.photoUrl);
    setFormEmergency(contact.isEmergency);
    setFormSafeZone(contact.isSafeZone);
    setFormLowBattery(contact.isLowBattery);
    setEditingContact(contact);
    setIsAddingNew(false);
  };

  const handleCloseModal = () => {
    setEditingContact(null);
    setIsAddingNew(false);
  };

  const handleSaveModal = () => {
    if (!formName.trim()) {
      alert('Por favor escribe un nombre.');
      return;
    }
    if (!formPhone.trim()) {
      alert('Por favor escribe un número de teléfono.');
      return;
    }

    // Format phone with country code
    const formattedPhone = formPhone.startsWith('+')
      ? formPhone
      : `+${settings.countryCode} ${formPhone.replace(/\s+/g, ' ')}`;

    if (isAddingNew) {
      const colors = ['#0b6b3a', '#0b4f9e', '#7c3aed', '#991b1b', '#c2410c', '#0369a1'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      addContact({
        name: formName.trim().slice(0, 40),
        phone: formattedPhone,
        photoUrl: formPhoto,
        avatarColor: randomColor,
        isEmergency: formEmergency,
        isSafeZone: formSafeZone,
        isLowBattery: formLowBattery,
      });
    } else if (editingContact) {
      editContact(editingContact.id, {
        name: formName.trim().slice(0, 40),
        phone: formattedPhone,
        photoUrl: formPhoto,
        isEmergency: formEmergency,
        isSafeZone: formSafeZone,
        isLowBattery: formLowBattery,
      });
    }

    handleCloseModal();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setFormPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleEmergency = (id: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    if (nextVal) {
      const currentEmergencyCount = stagedContacts.filter(c => c.isEmergency).length;
      if (currentEmergencyCount >= 5) {
        alert('Máximo 5 contactos de emergencia permitidos.');
        return;
      }
    }
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, isEmergency: nextVal } : c));
    updateStagedContacts(updated);
  };

  const handleToggleCheckbox = (id: string, key: 'isSafeZone' | 'isLowBattery', currentVal: boolean) => {
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, [key]: !currentVal } : c));
    updateStagedContacts(updated);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-28">
      {/* Top Header & Counters matching [27] */}
      <div className="flex flex-col gap-3">
        <p className="text-xl font-bold text-[#14213d]">
          Emergencia: {emergencyCount} de 5 · Contactos: {totalCount} de 20
        </p>

        <button
          onClick={handleOpenAdd}
          className="w-full bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 px-6 rounded-2xl text-xl font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-[0.98]"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
          <span>Agregar contacto</span>
        </button>
      </div>

      {/* Contact Cards List [27] */}
      <div className="space-y-4 pt-1">
        {stagedContacts.map((contact, index) => (
          <div
            key={contact.id}
            className="bg-white border-2 border-[#ddd5c3] rounded-3xl p-5 shadow-sm space-y-4"
          >
            {/* Contact Info Header */}
            <div className="flex items-center gap-4">
              {contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt={contact.name}
                  className="w-16 h-16 rounded-full object-cover shadow-sm border border-[#ddd5c3]"
                />
              ) : (
                <div
                  style={{ backgroundColor: contact.avatarColor }}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-sm shrink-0"
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <h3 className="text-2xl font-extrabold text-[#14213d] truncate">
                  {contact.name}
                </h3>
                <p className="text-lg font-bold text-[#3b4863]">
                  {contact.phone}
                </p>
              </div>
            </div>

            {/* Checkboxes matching [27] */}
            <div className="space-y-2.5 pt-1 text-lg font-bold text-[#14213d]">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isEmergency}
                  onChange={() => handleToggleEmergency(contact.id, contact.isEmergency)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Emergencia (SOS y caídas)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isSafeZone}
                  onChange={() => handleToggleCheckbox(contact.id, 'isSafeZone', contact.isSafeZone)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Zona segura</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isLowBattery}
                  onChange={() => handleToggleCheckbox(contact.id, 'isLowBattery', contact.isLowBattery)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Batería baja</span>
              </label>
            </div>

            {/* Actions Grid: Subir, Bajar, Editar, Eliminar [27] */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={index === 0}
                onClick={() => reorderContact(contact.id, 'up')}
                className="bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-2 flex items-center justify-center gap-2 text-lg font-extrabold text-[#14213d] shadow-sm disabled:opacity-40 cursor-pointer active:scale-95 transition"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                <span>Subir</span>
              </button>

              <button
                disabled={index === stagedContacts.length - 1}
                onClick={() => reorderContact(contact.id, 'down')}
                className="bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-2 flex items-center justify-center gap-2 text-lg font-extrabold text-[#14213d] shadow-sm disabled:opacity-40 cursor-pointer active:scale-95 transition"
              >
                <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                <span>Bajar</span>
              </button>

              <button
                onClick={() => handleOpenEdit(contact)}
                className="bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-2 flex items-center justify-center gap-2 text-lg font-extrabold text-[#14213d] shadow-sm cursor-pointer active:scale-95 transition"
              >
                <Edit2 className="w-5 h-5 stroke-[2.5]" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar a ${contact.name}?`)) {
                    deleteContact(contact.id);
                  }
                }}
                className="bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-2 flex items-center justify-center gap-2 text-lg font-extrabold text-[#a61b1b] shadow-sm cursor-pointer active:scale-95 transition"
              >
                <Trash2 className="w-5 h-5 text-[#a61b1b] stroke-[2.5]" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Save / Discard Bar [27] */}
      {hasContactChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#f6f3ec]/95 backdrop-blur-md border-t-2 border-[#ddd5c3] p-4 flex items-center justify-between gap-4 max-w-lg mx-auto shadow-2xl animate-in slide-in-from-bottom">
          <button
            onClick={discardContactChanges}
            className="w-1/2 bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
          >
            Descartar
          </button>
          <button
            onClick={saveContactChanges}
            className="w-1/2 bg-[#0b4f9e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>Guardar</span>
          </button>
        </div>
      )}

      {/* Modal Agregar / Editar contacto [28] */}
      {(editingContact || isAddingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200">
            <h2 className="text-3xl font-extrabold text-[#14213d]">
              {isAddingNew ? 'Agregar contacto' : 'Editar contacto'}
            </h2>

            {/* Avatar & Photo button */}
            <div className="flex items-center gap-4">
              {formPhoto ? (
                <img
                  src={formPhoto}
                  alt="Foto"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#ddd5c3]"
                />
              ) : (
                <div
                  style={{ backgroundColor: editingContact?.avatarColor || '#0b4f9e' }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-md"
                >
                  {(formName || 'A').charAt(0).toUpperCase()}
                </div>
              )}

              <label className="bg-white border-2 border-[#7a7461] rounded-2xl py-3 px-4 flex items-center gap-2 text-lg font-bold text-[#14213d] cursor-pointer shadow-sm active:scale-95 transition">
                <Camera className="w-6 h-6 stroke-[2]" />
                <span>Cambiar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Nombre</label>
              <input
                type="text"
                value={formName}
                maxLength={40}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ej: Hugo"
                className="w-full border-2 border-[#7a7461] rounded-2xl p-4 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-lg font-bold text-[#14213d]">Teléfono</label>
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="300 123 4561"
                className="w-full border-2 border-[#7a7461] rounded-2xl p-4 text-xl font-bold text-[#14213d] focus:outline-none focus:border-[#0b4f9e]"
              />
              <p className="text-sm font-semibold text-[#3b4863]">
                Se guardará como +{settings.countryCode} {formPhone.replace(/\s+/g, '')}
              </p>
            </div>

            {/* Checkboxes "A quién se le avisa" [28] */}
            <div className="space-y-3 pt-2">
              <p className="text-lg font-extrabold text-[#14213d]">A quién se le avisa</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEmergency}
                  onChange={e => setFormEmergency(e.target.checked)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span className="text-lg font-bold text-[#14213d]">Emergencia (SOS y caídas)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSafeZone}
                  onChange={e => setFormSafeZone(e.target.checked)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span className="text-lg font-bold text-[#14213d]">Zona segura</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formLowBattery}
                  onChange={e => setFormLowBattery(e.target.checked)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span className="text-lg font-bold text-[#14213d]">Batería baja</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={handleCloseModal}
                className="bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveModal}
                className="bg-[#0b4f9e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
