import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Camera,
  Check,
  Cloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Contact } from '../../types';

export const PanelContacts: React.FC = () => {
  const {
    stagedContacts,
    hasContactChanges,
    isSavingContacts,
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
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Form states for modal [28]
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | undefined>();
  const [formEmergency, setFormEmergency] = useState(true);
  const [formSafeZone, setFormSafeZone] = useState(false);
  const [formLowBattery, setFormLowBattery] = useState(true);

  const emergencyCount = stagedContacts.filter(c => c.isEmergency).length;
  const totalCount = stagedContacts.length;

  const showSaveSuccess = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

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

  const handleSaveModal = async () => {
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
      await addContact({
        name: formName.trim().slice(0, 40),
        phone: formattedPhone,
        photoUrl: formPhoto,
        avatarColor: randomColor,
        isEmergency: formEmergency,
        isSafeZone: formSafeZone,
        isLowBattery: formLowBattery,
      });
      showSaveSuccess('¡Contacto guardado!');
    } else if (editingContact) {
      await editContact(editingContact.id, {
        name: formName.trim().slice(0, 40),
        phone: formattedPhone,
        photoUrl: formPhoto,
        isEmergency: formEmergency,
        isSafeZone: formSafeZone,
        isLowBattery: formLowBattery,
      });
      showSaveSuccess('¡Contacto actualizado!');
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xl font-bold text-[#14213d]">
            Emergencia: {emergencyCount} de 5 · Contactos: {totalCount} de 20
          </p>

          {/* Sync Status Badge */}
          {isSavingContacts ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#0b4f9e] bg-[#eef4fb] border border-[#0b4f9e]/30 px-3 py-1 rounded-full shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#0b4f9e]" />
              <span>Guardando...</span>
            </span>
          ) : saveFeedback ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#0b6b3a] bg-[#eaf5ed] border border-[#0b6b3a]/30 px-3 py-1 rounded-full shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#0b6b3a]" />
              <span>{saveFeedback}</span>
            </span>
          ) : hasContactChanges ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#854d0e] bg-[#fef9c3] border border-[#ca8a04]/40 px-3 py-1 rounded-full shadow-xs">
              <AlertCircle className="w-4 h-4 text-[#ca8a04]" />
              <span>Cambios pendientes</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0b6b3a] bg-[#eaf5ed] border border-[#0b6b3a]/20 px-3 py-1 rounded-full shadow-xs">
              <Cloud className="w-4 h-4 text-[#0b6b3a]" />
              <span>Sincronizado</span>
            </span>
          )}
        </div>

        {/* Top Banner when there are pending changes */}
        {hasContactChanges && (
          <div className="bg-[#fef9c3] border-2 border-[#ca8a04] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-6 h-6 text-[#ca8a04] shrink-0" />
              <div>
                <p className="font-extrabold text-base text-[#713f12]">Tienes cambios pendientes</p>
                <p className="text-sm font-semibold text-[#854d0e]">
                  Presiona &quot;Guardar cambios&quot; para guardar los cambios.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={discardContactChanges}
                className="bg-white border-2 border-[#7a7461] text-[#14213d] px-3.5 py-2 rounded-xl text-sm font-extrabold hover:bg-stone-50 active:scale-95 transition cursor-pointer"
              >
                Descartar
              </button>
              <button
                onClick={async () => {
                  const ok = await saveContactChanges();
                  if (ok) showSaveSuccess('¡Guardado!');
                }}
                disabled={isSavingContacts}
                className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-md flex items-center gap-1.5 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {isSavingContacts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                <span className="whitespace-nowrap">Guardar<span className="max-[399px]:hidden"> cambios</span></span>
              </button>
            </div>
          </div>
        )}

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
        {stagedContacts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#ddd5c3] rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-[#eef4fb] rounded-full flex items-center justify-center text-[#0b4f9e]">
              <Plus className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-[#14213d]">
                No hay contactos registrados todavía
              </h3>
              <p className="text-lg font-bold text-[#7a7461] max-w-md mx-auto">
                Tu lista familiar está vacía. Toca el botón de arriba para agregar a los familiares, cuidadores o médicos.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3 px-6 rounded-2xl text-lg font-extrabold inline-flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Agregar primer contacto</span>
            </button>
          </div>
        ) : (
          stagedContacts.map((contact, index) => (
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
              <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isEmergency}
                  onChange={() => handleToggleEmergency(contact.id, contact.isEmergency)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Emergencia (SOS y caídas)</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isSafeZone}
                  onChange={() => handleToggleCheckbox(contact.id, 'isSafeZone', contact.isSafeZone)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Zona segura</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
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
        ))
        )}
      </div>

      {/* Sticky Bottom Save / Discard Bar [27] - Positioned above 5-tab nav bar */}
      {hasContactChanges && (
        <div className="fixed bottom-[calc(var(--nav-h)+0.5rem)] left-4 right-4 z-50 bg-[#14213d] text-white border-2 border-[#ddd5c3] p-3.5 rounded-3xl flex items-center justify-between gap-3 max-w-lg mx-auto shadow-2xl animate-in slide-in-from-bottom">
          <div className="hidden sm:flex flex-col pl-2">
            <span className="text-sm font-extrabold text-[#f6f3ec]">Cambios sin guardar</span>
            <span className="text-xs text-[#ddd5c3]/80">Se guardarán en la nube</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={discardContactChanges}
              className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 border border-white/30 text-white py-3 px-4 rounded-2xl text-lg font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={async () => {
                const ok = await saveContactChanges();
                if (ok) showSaveSuccess('¡Guardado!');
              }}
              disabled={isSavingContacts}
              className="flex-1 sm:flex-initial bg-[#0b6b3a] hover:bg-[#09572f] text-white py-3 px-5 rounded-2xl text-lg font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingContacts ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5 stroke-[3]" />
              )}
              <span className="whitespace-nowrap">Guardar<span className="max-[399px]:hidden"> cambios</span></span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Agregar / Editar contacto [28] */}
      {(editingContact || isAddingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[max(1.25rem,var(--safe-bottom))] shadow-2xl max-h-[92dvh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200">
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

            {/* Sync notice */}
            <div className="bg-[#eaf5ed] border border-[#0b6b3a]/30 rounded-2xl p-3 flex items-center gap-2 text-[#0b6b3a]">
              <Cloud className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">
                Al presionar &quot;Guardar contacto&quot;, el contacto se guardará en la cuenta familiar.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCloseModal}
                className="bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-xl font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveModal}
                disabled={isSavingContacts}
                className="bg-[#0b4f9e] hover:bg-[#093f7e] text-white py-3.5 rounded-2xl text-xl font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingContacts ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Check className="w-6 h-6 stroke-[3]" />
                )}
                <span>Guardar contacto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
