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
import { getFamiliaUuid } from '../../services/dataService';

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
    account,
  } = useApp();

  const [linkError, setLinkError] = useState('');

  // Abre WhatsApp con el enlace para que ese contacto active los avisos en su celular.
  const sendAvisosLink = async (contact: Contact) => {
    setLinkError('');
    let stored = '';
    try {
      stored = localStorage.getItem('essimple_family_id') || '';
    } catch {
      // ignorar
    }
    const familiaUuid = await getFamiliaUuid(stored && stored !== 'local-family-id' ? stored : account.familiaId || account.email || '');
    if (!familiaUuid) {
      setLinkError('No se pudo identificar la familia. Vuelve a iniciar sesión.');
      return;
    }
    const cc = (settings.countryCode || '+57').replace(/\D/g, '') || '57';
    const digits = (contact.phone || '').replace(/\D/g, '');
    const full = digits.length === 10 && !digits.startsWith(cc) ? `${cc}${digits}` : digits;
    const link = `${window.location.origin}/avisos/${familiaUuid}/${full}`;
    const text = `Hola ${contact.name}, abre este enlace en tu celular y toca "Activar avisos" para enterarte si ${settings.personName || 'tu familiar'} sale de su zona segura o tiene la batería baja: ${link}`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
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

  const handleToggleEmergency = async (id: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    if (nextVal) {
      const currentEmergencyCount = stagedContacts.filter(c => c.isEmergency).length;
      if (currentEmergencyCount >= 5) {
        alert('Máximo 5 contactos de emergencia permitidos.');
        return;
      }
    }
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, isEmergency: nextVal } : c));
    await updateStagedContacts(updated);
    showSaveSuccess('¡Guardado!');
  };

  const handleToggleCheckbox = async (id: string, key: 'isSafeZone' | 'isLowBattery', currentVal: boolean) => {
    const updated = stagedContacts.map(c => (c.id === id ? { ...c, [key]: !currentVal } : c));
    await updateStagedContacts(updated);
    showSaveSuccess('¡Guardado!');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-6">
      {/* Top Header & Counters */}
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
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0b6b3a] bg-[#eaf5ed] border border-[#0b6b3a]/20 px-3 py-1 rounded-full shadow-xs">
              <Cloud className="w-4 h-4 text-[#0b6b3a]" />
              <span>Sincronizado</span>
            </span>
          )}
        </div>

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
                <span>Emergencia (SOS)</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isSafeZone}
                  onChange={() => handleToggleCheckbox(contact.id, 'isSafeZone', contact.isSafeZone)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Zona segura (notificación al celular)</span>
              </label>

              <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contact.isLowBattery}
                  onChange={() => handleToggleCheckbox(contact.id, 'isLowBattery', contact.isLowBattery)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span>Batería baja (notificación al celular)</span>
              </label>

              {(contact.isSafeZone || contact.isLowBattery) && contact.phone && (
                <button
                  onClick={() => sendAvisosLink(contact)}
                  className="w-full bg-[#fff1c9] border-2 border-[#b7791f] text-[#5c3a00] rounded-2xl py-3 px-3 text-lg font-extrabold cursor-pointer active:scale-95 transition"
                >
                  Enviar enlace para activar avisos
                </button>
              )}
              {linkError && <p className="text-base font-bold text-[#a61b1b]">{linkError}</p>}
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
                onClick={() => setContactToDelete(contact)}
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
                <span className="text-lg font-bold text-[#14213d]">Emergencia (SOS)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSafeZone}
                  onChange={e => setFormSafeZone(e.target.checked)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span className="text-lg font-bold text-[#14213d]">Zona segura (notificación al celular)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formLowBattery}
                  onChange={e => setFormLowBattery(e.target.checked)}
                  className="w-6 h-6 rounded text-[#0b4f9e] accent-[#0b4f9e] cursor-pointer"
                />
                <span className="text-lg font-bold text-[#14213d]">Batería baja (notificación al celular)</span>
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

      {/* Modal Confirmar Eliminar Contacto */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center text-[#a61b1b]">
              <Trash2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-extrabold text-[#14213d]">
                ¿Eliminar a {contactToDelete.name}?
              </h3>
              <p className="text-base font-semibold text-[#7a7461]">
                El contacto se eliminará de la lista y se sincronizará automáticamente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="bg-white border-2 border-[#7a7461] text-[#14213d] py-3.5 rounded-2xl text-lg font-extrabold hover:bg-stone-50 cursor-pointer active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = contactToDelete.id;
                  setContactToDelete(null);
                  await deleteContact(targetId);
                  showSaveSuccess('Contacto eliminado');
                }}
                className="bg-[#a61b1b] hover:bg-[#8a1515] text-white py-3.5 rounded-2xl text-lg font-extrabold shadow-md cursor-pointer active:scale-95 transition"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
