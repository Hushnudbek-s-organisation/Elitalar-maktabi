"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, MoreVertical, Paperclip, Send, Smile, Phone, Video, Users, CheckCheck, 
  Menu, Bookmark, User, Megaphone, Settings, Moon, Sun, ChevronDown, X, Trash2, 
  BellOff, Ban, Image as ImageIcon, Camera, MessageCircle, Edit2, Check, Bell, 
  Lock, Folder, Sliders, Volume2, Battery, Languages, ArrowLeft, Type, Mic, Play, 
  File as FileIcon, CheckSquare, Square, FolderPlus
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStoredSession } from "@/lib/session";
import { safeJsonParse } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MessengerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [student, setStudent] = useState<any>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const activeChatRef = useRef<any>(null);

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const [folders, setFolders] = useState<any[]>([{ id: 'all', name: 'Barchasi', chatIds: [] }]);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedChatsForFolder, setSelectedChatsForFolder] = useState<string[]>([]);

  // Modallar
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showEditChatModal, setShowEditChatModal] = useState(false);

  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [mutedChats, setMutedChats] = useState<string[]>([]);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageRequestRef = useRef(0);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsView, setSettingsView] = useState("main");
  const [appSettings, setAppSettings] = useState({ textSize: "medium", enterToSend: true, language: "English" });

  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");

  useEffect(() => {
    if (!uploadImage) {
      setUploadPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(uploadImage);
    setUploadPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [uploadImage]);

  const fetchChats = useCallback(async (userId: string) => {
    const [{ data: contactsData, error: contactsError }, { data: groupChannels, error: chatsError }] = await Promise.all([
      supabase.from("contacts").select("owner_id, contact_id, contact_name").eq("owner_id", userId),
      supabase.from("chats").select("id, name, type, avatar_url, created_by, created_at").order("created_at", { ascending: false }),
    ]);
    if (contactsError) console.error("Kontaktlarni yuklashda xatolik:", contactsError.message);
    if (chatsError) console.error("Guruhlarni yuklashda xatolik:", chatsError.message);

    const contactIds = [...new Set((contactsData ?? []).map((item) => item.contact_id).filter(Boolean))];
    const { data: profiles } = contactIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", contactIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const allChats: any[] = [{ id: "saved", name: "Saqlangan xabarlar", type: "saved", avatar_url: null, created_by: userId }];
    setContacts(contactsData ?? []);
    for (const contact of contactsData ?? []) {
      const profile = profileById.get(contact.contact_id);
      allChats.push({
        id: contact.contact_id,
        name: profile?.full_name || contact.contact_name || contact.contact_id,
        type: "personal",
        avatar_url: profile?.avatar_url || null,
        isOnline: false,
      });
    }
    setChats([...allChats, ...(groupChannels ?? [])]);
  }, []);

  // Aktiv chatni doimiy eslab qolish uchun ref
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session.id || session.role !== "student") { router.replace("/"); return; }
    const studentId = session.id;
    if (!isSupabaseConfigured) {
      setLoadError("Messenger bazasi sozlanmagan.");
      return;
    }

    const savedTheme = localStorage.getItem("theme");
    setIsDarkMode(savedTheme === "dark" || document.documentElement.classList.contains("dark"));

    const savedFolders = safeJsonParse<unknown>(localStorage.getItem(`folders_${studentId}`), []);
    const loadedFolders = Array.isArray(savedFolders) ? savedFolders : [];
    setFolders([{ id: "all", name: "Barchasi", chatIds: [] }, ...loadedFolders.filter((folder: any) => folder?.id !== "all")]);
    setMutedChats(safeJsonParse<string[]>(localStorage.getItem(`muted_chats_${studentId}`) || localStorage.getItem("muted_chats"), []));

    let alive = true;
    const loadData = async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name, avatar_url, username")
        .eq("id", studentId)
        .maybeSingle();
      if (!alive) return;
      if (profileError || !profile || profile.role !== "student") {
        setLoadError("O'quvchi profilini yuklab bo'lmadi.");
        return;
      }
      setStudent(profile);
      setProfileName(profile.full_name || "");
      setProfileUsername(profile.username || "");
      await fetchChats(studentId);
    };
    void loadData().catch((error) => {
      console.error(error);
      if (alive) setLoadError("Messenger ma'lumotlarini yuklashda xatolik yuz berdi.");
    });

    const msgSubscription = supabase.channel(`realtime-messages-${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload: any) => {
        const newMsg = payload.new;
        const currentChat = activeChatRef.current;
        if (!newMsg) return;
        if (payload.eventType === "INSERT") {
          const belongsToUser = newMsg.receiver_id === studentId || newMsg.sender_id === studentId;
          if (!belongsToUser) return;
          const isForCurrentChat = currentChat && (
            (currentChat.type === "personal" && ((newMsg.sender_id === currentChat.id && newMsg.receiver_id === studentId) || (newMsg.receiver_id === currentChat.id && newMsg.sender_id === studentId))) ||
            (currentChat.id === "saved" && newMsg.sender_id === studentId && newMsg.receiver_id === studentId) ||
            ((currentChat.type === "group" || currentChat.type === "channel") && newMsg.receiver_id === currentChat.id)
          );
          if (isForCurrentChat) {
            setMessages((previous) => previous.some((message) => message.id === newMsg.id) ? previous : [...previous, newMsg]);
            if (newMsg.receiver_id === studentId && newMsg.sender_id !== studentId) {
              void supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            }
          }
          void fetchChats(studentId);
        } else if (payload.eventType === "UPDATE") {
          setMessages((previous) => previous.map((message) => message.id === newMsg.id ? newMsg : message));
        }
      }).subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(msgSubscription);
    };
  }, [fetchChats, router]);

  useEffect(() => {
    if (isRecordingAudio || isRecordingVideo) {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((previous) => previous + 1), 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecordingAudio, isRecordingVideo]);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === "recording") {
      discardRecordingRef.current = true;
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); setIsDarkMode(false); } 
    else { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); setIsDarkMode(true); }
  };

  // ==========================================
  // ISMLAR VA RASMLAR CHALKASHMASLIGI UCHUN CHATLARNI TO'G'RI YUKLASH
  // ==========================================


  const fetchMessages = async (chatId: string | number) => {
    const requestId = ++messageRequestRef.current;
    const myId = student?.id || getStoredSession().id;
    if (!myId) return;
    const selectedChat = chats.find((chat) => String(chat.id) === String(chatId)) || activeChat;
    const isGroupOrChannel = selectedChat?.type === "group" || selectedChat?.type === "channel";

    let query = supabase.from("messages").select("*").order("created_at", { ascending: true });
    if (chatId === "saved") {
      query = query.eq("sender_id", myId).eq("receiver_id", myId);
    } else if (isGroupOrChannel) {
      query = query.eq("receiver_id", chatId);
    } else {
      query = query.or(`and(sender_id.eq.${myId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${myId})`);
    }
    const { data, error } = await query;
    if (requestId !== messageRequestRef.current) return;
    if (error) {
      toast.error("Xabarlarni yuklab bo'lmadi.");
      return;
    }
    setMessages(data || []);
    if (chatId !== "saved") {
      const readQuery = supabase.from("messages").update({ is_read: true }).eq("is_read", false);
      if (isGroupOrChannel) await readQuery.eq("receiver_id", chatId);
      else await readQuery.eq("sender_id", chatId).eq("receiver_id", myId);
    }
  };

  const toggleChatSelectionForFolder = (chatId: string) => {
    if (selectedChatsForFolder.includes(chatId)) setSelectedChatsForFolder(selectedChatsForFolder.filter(id => id !== chatId));
    else setSelectedChatsForFolder([...selectedChatsForFolder, chatId]);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return toast.error("Papka nomini kiriting.");
    if (!selectedChatsForFolder.length) return toast.error("Kamida bitta chat tanlang.");
    if (!student) return;
    const newFolder = { id: Date.now().toString(), name: newFolderName.trim(), chatIds: selectedChatsForFolder };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem(`folders_${student.id}`, JSON.stringify(updatedFolders));
    setShowFolderModal(false);
    setNewFolderName("");
    setSelectedChatsForFolder([]);
    toast.success("Papka yaratildi.");
  };

  const handleUploadFile = async (file: File, bucket: string = "attachments") => {
    if (file.size > 25 * 1024 * 1024) throw new Error("Fayl hajmi 25 MB dan oshmasligi kerak.");
    const rawExtension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const fileExt = /^[a-z0-9]{1,8}$/.test(rawExtension) ? rawExtension : "bin";
    const uniqueName = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${fileExt}`;
    const fileName = `${uniqueName}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
  };

  const handleSendMessage = async (
    event?: { preventDefault: () => void },
    type: string = "text",
    fileUrl: string = "",
    targetChat: any = activeChat,
  ) => {
    event?.preventDefault();
    const myId = student?.id || getStoredSession().id;
    if (!targetChat || !myId || isSendingMessage) return;
    const textToSend = type === "text" ? messageInput.trim() : "";
    if (type === "text" && !textToSend) return;
    const receiver = targetChat.id === "saved" ? myId : targetChat.id;
    setIsSendingMessage(true);
    const { data, error } = await supabase.from("messages").insert([{
      sender_id: myId,
      receiver_id: receiver,
      text: textToSend,
      msg_type: type,
      file_url: fileUrl,
      is_read: false,
    }]).select("*").single();
    setIsSendingMessage(false);

    if (error) {
      console.error("Xabar yuborishda xatolik:", error.message);
      toast.error("Xabar yuborilmadi. Ulanish yoki ruxsatlarni tekshiring.");
      return;
    }
    if (type === "text") setMessageInput((current) => current === textToSend ? "" : current);
    if (activeChatRef.current?.id === targetChat.id && data) {
      setMessages((previous) => previous.some((message) => message.id === data.id) ? previous : [...previous, data]);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetChat = activeChat;
    event.target.value = "";
    if (!file || !targetChat) return;
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file";
    setIsUploading(true);
    try {
      const fileUrl = await handleUploadFile(file);
      await handleSendMessage(undefined, type, fileUrl, targetChat);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Fayl yuklanmadi. Storage bucket sozlamasini tekshiring.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async (kind: "voice" | "round_video") => {
    const targetChat = activeChat;
    if (!targetChat) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Ushbu brauzer audio/video yozishni qo'llab-quvvatlamaydi.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(kind === "voice" ? { audio: true } : { audio: true, video: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      discardRecordingRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onerror = () => toast.error("Media yozishda xatolik yuz berdi.");
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecordingAudio(false);
        setIsRecordingVideo(false);
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          recordingChunksRef.current = [];
          return;
        }
        const mimeType = recorder.mimeType || (kind === "voice" ? "audio/webm" : "video/webm");
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        recordingChunksRef.current = [];
        if (!blob.size) {
          toast.error("Yozuv bo'sh. Mikrofon/kamerani tekshirib qayta yozing.");
          return;
        }
        const extension = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `${kind}-${Date.now()}.${extension}`, { type: mimeType });
        setIsUploading(true);
        try {
          const fileUrl = await handleUploadFile(file);
          await handleSendMessage(undefined, kind, fileUrl, targetChat);
        } catch (recordingError) {
          toast.error(recordingError instanceof Error ? recordingError.message : "Yozuvni yuklab bo'lmadi.");
        } finally {
          setIsUploading(false);
        }
      };
      recorder.start();
      setRecordingTime(0);
      if (kind === "voice") setIsRecordingAudio(true);
      else setIsRecordingVideo(true);
    } catch (recordingError) {
      toast.error(recordingError instanceof Error ? recordingError.message : "Mikrofon yoki kameraga ruxsat berilmadi.");
    }
  };

  const stopRecordingAndSend = (kind: "voice" | "round_video") => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    if ((kind === "voice" && !isRecordingAudio) || (kind === "round_video" && !isRecordingVideo)) return;
    recorder.stop();
  };

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    else {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setIsRecordingAudio(false);
      setIsRecordingVideo(false);
    }
  };

  const toggleMute = () => {
    if (!activeChat || !student) return;
    const chatId = String(activeChat.id);
    const updated = mutedChats.includes(chatId) ? mutedChats.filter((id) => id !== chatId) : [...mutedChats, chatId];
    setMutedChats(updated);
    localStorage.setItem(`muted_chats_${student.id}`, JSON.stringify(updated));
    setShowChatMenu(false);
  };

  const handleClearHistory = async () => {
    if (!activeChat || !student || !window.confirm("Ushbu suhbat tarixini o'chirasizmi?")) return;
    let deleteQuery = supabase.from("messages").delete();
    if (activeChat.type === "group" || activeChat.type === "channel") {
      deleteQuery = deleteQuery.eq("receiver_id", activeChat.id);
    } else {
      const receiver = activeChat.id === "saved" ? student.id : activeChat.id;
      deleteQuery = deleteQuery.or(`and(sender_id.eq.${student.id},receiver_id.eq.${receiver}),and(sender_id.eq.${receiver},receiver_id.eq.${student.id})`);
    }
    const { error } = await deleteQuery;
    if (error) {
      toast.error("Suhbat tarixini o'chirib bo'lmadi.");
      return;
    }
    setMessages([]);
    setShowChatMenu(false);
    toast.success("Suhbat tarixi tozalandi.");
  };

  const handleAddContact = async () => {
    if (!student) return;
    const normalizedId = contactId.trim().toUpperCase();
    if (!normalizedId || !contactName.trim()) return toast.error("ID va kontakt nomini kiriting.");
    if (normalizedId === student.id) return toast.error("O'zingizni kontakt sifatida qo'sha olmaysiz.");
    setIsUploading(true);
    const { data: profile, error: lookupError } = await supabase.from("profiles").select("id").eq("id", normalizedId).maybeSingle();
    if (lookupError || !profile) {
      toast.error("Bunday ID raqamli foydalanuvchi topilmadi.");
      setIsUploading(false);
      return;
    }
    const { error } = await supabase.from("contacts").insert([{ owner_id: student.id, contact_id: normalizedId, contact_name: contactName.trim() }]);
    if (error) {
      toast.error(error.code === "23505" ? "Bu kontakt ro'yxatda bor." : "Kontaktni saqlab bo'lmadi.");
      setIsUploading(false);
      return;
    }
    await fetchChats(student.id);
    setShowAddContactModal(false);
    setContactId("");
    setContactName("");
    setIsUploading(false);
    toast.success("Kontakt qo'shildi.");
  };

  const handleCreateGroupOrChannel = async (type: "group" | "channel") => {
    if (!student || !newChatName.trim()) return toast.error("Chat nomini kiriting.");
    setIsUploading(true);
    try {
      let avatarUrl = "";
      if (uploadImage) avatarUrl = await handleUploadFile(uploadImage, "avatars");
      const { data, error } = await supabase.from("chats").insert([{ name: newChatName.trim(), type, avatar_url: avatarUrl || null, created_by: student.id }]).select("*").single();
      if (error) throw error;
      if (data) {
        await fetchChats(student.id);
        setActiveChat(data);
        setIsMobileChatOpen(true);
        setShowCreateGroupModal(false);
        setShowCreateChannelModal(false);
        setNewChatName("");
        setUploadImage(null);
        toast.success(type === "group" ? "Guruh yaratildi." : "Kanal yaratildi.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat yaratib bo'lmadi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateChat = async () => {
    if (!student || !activeChat || !newChatName.trim()) return toast.error("Chat nomini kiriting.");
    setIsUploading(true);
    try {
      let avatarUrl = activeChat.avatar_url;
      if (uploadImage) avatarUrl = await handleUploadFile(uploadImage, "avatars");
      const { error } = await supabase.from("chats").update({ name: newChatName.trim(), avatar_url: avatarUrl || null }).eq("id", activeChat.id).eq("created_by", student.id);
      if (error) throw error;
      await fetchChats(student.id);
      setActiveChat({ ...activeChat, name: newChatName.trim(), avatar_url: avatarUrl });
      setShowEditChatModal(false);
      setUploadImage(null);
      toast.success("Chat ma'lumotlari yangilandi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chatni yangilab bo'lmadi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!student || profileName.trim().length < 2) return toast.error("Ism-sharifni to'liq kiriting.");
    setIsUploading(true);
    try {
      let avatarUrl = student.avatar_url;
      if (uploadImage) avatarUrl = await handleUploadFile(uploadImage, "avatars");
      const username = profileUsername.trim().replace(/^@/, "");
      const { error } = await supabase.from("profiles").update({ full_name: profileName.trim(), username: username || null, avatar_url: avatarUrl || null }).eq("id", student.id);
      if (error) throw error;
      setStudent({ ...student, full_name: profileName.trim(), username, avatar_url: avatarUrl });
      setProfileName(profileName.trim());
      setProfileUsername(username);
      setSettingsView("main");
      setUploadImage(null);
      toast.success("Profil yangilandi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profilni saqlab bo'lmadi.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!student) return loadError
    ? <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#0e1621] p-6 text-center text-white"><p className="font-bold">Messenger ochilmadi</p><p className="max-w-md text-sm text-[#9db0c2]">{loadError}</p><button onClick={() => router.replace("/")} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold">Kirish sahifasiga qaytish</button></div>
    : <div className="flex h-full min-h-[50vh] items-center justify-center bg-[#0e1621]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  const currentFolder = folders.find((folder) => String(folder.id) === String(activeFolderId));
  const currentFolderChats = activeFolderId === "all" ? chats : chats.filter((chat) => currentFolder?.chatIds?.map(String).includes(String(chat.id)));
  const filteredChats = currentFolderChats.filter((chat) => String(chat.name ?? "Chat").toLocaleLowerCase("uz-UZ").includes(searchQuery.toLocaleLowerCase("uz-UZ")));

  const isOwner = activeChat && activeChat.created_by === student.id && (activeChat.type === "group" || activeChat.type === "channel");
  const textSizeClass = appSettings.textSize === "small" ? "text-[13px]" : appSettings.textSize === "large" ? "text-[17px]" : "text-[15px]";
  const formatTime = (secs: number) => { const m = Math.floor(secs/60); const s = secs%60; return `${m}:${s < 10 ? '0' : ''}${s}`; };
  const displayMessages = showChatSearch && chatSearchQuery ? messages.filter(m => m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase())) : messages;

  return (
    <div className="w-full h-full bg-[#0e1621] text-white flex overflow-hidden relative">
      
      {isDrawerOpen && <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>}
      <div className={`absolute top-0 left-0 h-full w-[280px] bg-[#17212b] z-50 transform transition-transform duration-300 flex flex-col shadow-2xl ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 bg-[#2b5278] text-white relative">
           <div className="flex justify-between items-start mb-4">
             <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center font-black text-2xl shadow-lg overflow-hidden border border-white/20">
               {student.avatar_url ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover"/> : student.full_name.charAt(0)}
             </div>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition-colors">
               {isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
             </button>
           </div>
           <div className="flex justify-between items-center cursor-pointer" onClick={() => {setSettingsView("account"); setShowSettingsModal(true); setIsDrawerOpen(false);}}>
              <div>
                 <h3 className="font-bold text-[15px]">{student.full_name}</h3>
                 <p className="text-xs text-blue-200 opacity-80">{student.username ? `@${student.username}` : `ID: ${student.id}`}</p>
              </div>
              <ChevronDown className="w-5 h-5" />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 text-[#708499]">
           <div onClick={() => {setShowCreateGroupModal(true); setIsDrawerOpen(false);}} className="flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] cursor-pointer hover:text-white transition-colors"><Users className="w-5 h-5" /> <span className="font-medium text-[15px]">Yangi Guruh</span></div>
           <div onClick={() => {setShowCreateChannelModal(true); setIsDrawerOpen(false);}} className="flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] cursor-pointer hover:text-white transition-colors"><Megaphone className="w-5 h-5" /> <span className="font-medium text-[15px]">Yangi Kanal</span></div>
           <div onClick={() => {setShowFolderModal(true); setIsDrawerOpen(false);}} className="flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] cursor-pointer hover:text-white transition-colors"><FolderPlus className="w-5 h-5" /> <span className="font-medium text-[15px]">Yangi Papka (Folder)</span></div>
           <div className="h-[1px] bg-[#0e1621] my-1 mx-2"></div>
           <div onClick={() => {const saved = chats.find(c => c.id === 'saved'); if(saved) { setActiveChat(saved); fetchMessages('saved'); } setIsDrawerOpen(false);}} className="flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] cursor-pointer hover:text-white transition-colors"><Bookmark className="w-5 h-5" /> <span className="font-medium text-[15px]">Saqlangan Xabarlar</span></div>
           <div onClick={() => {setSettingsView("main"); setShowSettingsModal(true); setIsDrawerOpen(false);}} className="flex items-center gap-4 px-5 py-3 hover:bg-[#202b36] cursor-pointer hover:text-white transition-colors"><Settings className="w-5 h-5" /> <span className="font-medium text-[15px]">Sozlamalar</span></div>
        </div>
      </div>

      <div className={`w-full shrink-0 flex-col border-r border-[#0e1621] bg-[#17212b] relative z-10 md:flex md:w-[340px] ${isMobileChatOpen ? "hidden" : "flex"}`}>
        <div className="p-3 flex items-center gap-3 bg-[#17212b]">
          <Menu onClick={() => setIsDrawerOpen(true)} className="w-6 h-6 text-[#708499] cursor-pointer hover:text-white transition-colors" />
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#708499]" />
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Qidiruv" className="w-full bg-[#242f3d] rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-white placeholder-[#708499]" />
          </div>
        </div>

        {folders.length > 1 && (
          <div className="flex overflow-x-auto hide-scrollbar border-b border-[#0e1621] px-2 py-1 bg-[#17212b]">
             {folders.map(f => (
                <button key={f.id} onClick={() => setActiveFolderId(f.id)} className={`px-4 py-1.5 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${activeFolderId === f.id ? 'border-blue-500 text-blue-500' : 'border-transparent text-[#708499] hover:text-gray-300'}`}>
                  {f.name}
                </button>
             ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredChats.length === 0 ? (
             <p className="text-center text-[#708499] mt-10 text-sm">Hech narsa topilmadi.</p>
          ) : (
            filteredChats.map(chat => {
              const isActive = activeChat?.id === chat.id;
              const isSaved = chat.id === 'saved';
              return (
                <button type="button" key={chat.id} onClick={() => { setActiveChat(chat); setIsMobileChatOpen(true); setMessages([]); void fetchMessages(chat.id); setShowChatSearch(false); }} className={`flex w-full items-center gap-3 p-2.5 text-left transition-colors ${isActive ? 'bg-[#2b5278]' : 'hover:bg-[#202b36]'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white overflow-hidden flex-shrink-0 ${isSaved ? 'bg-[#4a8ebf]' : 'bg-gradient-to-tr from-blue-500 to-indigo-500'}`}>
                    {isSaved ? <Bookmark className="w-6 h-6"/> : chat.avatar_url ? <img src={chat.avatar_url} alt="" className="w-full h-full object-cover"/> : String(chat.name || "C").charAt(0)}
                  </div>
                  <div className={`flex-1 min-w-0 border-b pb-2 ${isActive ? 'border-transparent' : 'border-[#0e1621]'}`}>
                    <div className="flex justify-between items-center mb-0.5 mt-1">
                      <h3 className={`font-bold text-[15px] truncate pr-2 text-white`}>{chat.name}</h3>
                      {mutedChats.includes(String(chat.id)) && <BellOff className="w-3 h-3 text-[#708499]"/>}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[13px] truncate pr-2 text-[#4a8ebf] capitalize">{chat.type}</p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <button onClick={() => setShowAddContactModal(true)} className="absolute bottom-6 right-6 w-14 h-14 bg-[#4a8ebf] hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20">
          <Edit2 className="w-6 h-6 ml-1" />
        </button>
      </div>

      <div className={`relative min-w-0 flex-1 flex-col bg-[#0e1621] md:flex ${isMobileChatOpen ? "flex" : "hidden"}`}>
        {activeChat ? (
          <>
            <div className="z-10 flex h-[60px] items-center justify-between border-b border-[#0e1621] bg-[#17212b] px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button type="button" aria-label="Chatlar ro'yxatiga qaytish" onClick={() => setIsMobileChatOpen(false)} className="rounded-full p-2 text-[#9db0c2] hover:bg-[#202b36] md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500 font-bold text-white">
                  {activeChat.id === "saved" ? <Bookmark className="h-5 w-5"/> : activeChat.avatar_url ? <img src={activeChat.avatar_url} alt="" className="h-full w-full object-cover"/> : String(activeChat.name || "C").charAt(0)}
                </div>
                <div>
                  <h2 className="flex items-center text-[15px] font-bold text-white">{activeChat.name} {mutedChats.includes(String(activeChat.id)) && <BellOff className="ml-2 h-3.5 w-3.5 text-[#708499]"/>}</h2>
                  <p className="text-[13px] text-[#708499]">
                    {activeChat.id === 'saved' ? 'Shaxsiy xotirangiz' : activeChat.type === 'personal' ? 'Yaqinda kirdi' : activeChat.type === 'channel' ? 'Kanal' : 'Guruh'}
                  </p>
                </div>
              </div>
              <div className="relative flex items-center gap-2 text-[#708499] sm:gap-4">
                <button type="button" aria-label="Xabarlardan qidirish" onClick={() => setShowChatSearch(!showChatSearch)} className={`rounded-lg p-2 hover:bg-[#202b36] hover:text-white ${showChatSearch ? "text-blue-500" : ""}`}><Search className="h-5 w-5" /></button>
                <button type="button" title="Qo'ng'iroqlar hozircha sozlanmagan" aria-label="Qo'ng'iroqlar hozircha mavjud emas" onClick={() => toast.info("Audio qo'ng'iroqlar funksiyasi hali ulanmagan.")} className="rounded-lg p-2 hover:bg-[#202b36] hover:text-white"><Phone className="h-5 w-5" /></button>
                <button type="button" aria-label="Chat menyusi" aria-expanded={showChatMenu} onClick={() => setShowChatMenu(!showChatMenu)} className="rounded-lg p-2 hover:bg-[#202b36] hover:text-white"><MoreVertical className="h-5 w-5" /></button>
                {showChatMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-[#17212b] rounded-xl shadow-2xl border border-slate-800 py-2 z-50 animate-in zoom-in-95">
                    {isOwner && <button onClick={() => {setNewChatName(activeChat.name); setShowEditChatModal(true); setShowChatMenu(false);}} className="w-full flex items-center px-4 py-2.5 text-sm text-white hover:bg-[#202b36]"><Edit2 className="w-4 h-4 mr-3 text-blue-400"/> Tahrirlash</button>}
                    <button onClick={toggleMute} className="flex w-full items-center px-4 py-2.5 text-sm text-white hover:bg-[#202b36]"><BellOff className="mr-3 h-4 w-4 text-[#708499]"/> {mutedChats.includes(String(activeChat.id)) ? "Ovozni yoqish" : "Ovozsiz qilish"}</button>
                    <div className="h-[1px] bg-[#0e1621] my-1"></div>
                    <button onClick={handleClearHistory} className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-[#202b36]"><Trash2 className="w-4 h-4 mr-3"/> Tarixni tozalash</button>
                  </div>
                )}
              </div>
            </div>

            {showChatSearch && (
              <div className="bg-[#17212b] p-2 border-b border-[#0e1621] flex items-center gap-2 px-4 animate-in slide-in-from-top-2">
                <Search className="w-4 h-4 text-[#708499]"/>
                <input type="text" autoFocus value={chatSearchQuery} onChange={e=>setChatSearchQuery(e.target.value)} placeholder="Xabarlardan qidirish..." className="flex-1 bg-transparent outline-none text-sm text-white"/>
                <button onClick={() => {setShowChatSearch(false); setChatSearchQuery("");}}><X className="w-4 h-4 text-[#708499] hover:text-white"/></button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 flex flex-col scrollbar-thin bg-black/20">
              {displayMessages.length === 0 ? (
                <div className="text-center mt-20 text-[#708499]">Xabarlar topilmadi.</div>
              ) : (
                displayMessages.map(msg => {
                  const isMe = msg.sender_id === student.id;
                  return (
                    <div key={msg.id} className={`flex max-w-xl ${isMe ? 'self-end' : 'self-start'}`}>
                      <div className={`rounded-2xl p-2.5 shadow-md ${isMe ? 'bg-[#2b5278] text-white rounded-br-sm' : 'bg-[#182533] text-white rounded-bl-sm'}`}>
                        
                        {msg.msg_type === "image" && <a href={msg.file_url} target="_blank" rel="noreferrer"><img src={msg.file_url} alt="Yuborilgan rasm" loading="lazy" className="mb-2 max-h-[300px] max-w-[280px] rounded-lg object-cover" /></a>}
                        {msg.msg_type === "video" && <video src={msg.file_url} controls playsInline className="mb-2 max-h-[300px] max-w-[280px] rounded-lg" />}
                        {(msg.msg_type === "audio" || msg.msg_type === "voice") && <audio src={msg.file_url} controls preload="metadata" className="mb-2 h-10 w-[min(250px,65vw)]" />}
                        {msg.msg_type === "file" && <a href={msg.file_url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 p-2 text-sm text-blue-200 underline"><FileIcon className="h-6 w-6 shrink-0 text-blue-300" /><span className="max-w-[200px] truncate">{msg.file_url?.split("/").pop()}</span></a>}
                        {msg.msg_type === "round_video" && <div className="mb-2 h-48 w-48 overflow-hidden rounded-full border-2 border-[#4a8ebf]"><video src={msg.file_url} controls playsInline className="h-full w-full object-cover" /></div>}

                        {msg.text && <p className={`${textSizeClass} leading-relaxed break-words`}>{msg.text}</p>}
                        
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-200' : 'text-[#708499]'}`}>
                          <span className="text-[10px]">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isMe && (msg.is_read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4 opacity-70" />)}
                        </div>
                        
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="bg-[#17212b] p-3 relative">
              {isRecordingAudio && (
                <div className="absolute inset-y-0 left-0 right-0 bg-[#17212b] z-20 flex items-center px-4 justify-between animate-in slide-in-from-right">
                   <div className="flex items-center text-red-500 font-bold gap-2 animate-pulse"><Mic className="w-5 h-5"/> {formatTime(recordingTime)}</div>
                   <div className="flex items-center gap-4">
                     <button type="button" onClick={cancelRecording} className="text-[#708499] hover:text-white">Bekor</button>
                     <button onClick={() => stopRecordingAndSend('voice')} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg"><Send className="w-5 h-5 ml-1"/></button>
                   </div>
                </div>
              )}

              {isRecordingVideo && (
                <div className="absolute inset-y-0 left-0 right-0 bg-[#17212b] z-20 flex items-center px-4 justify-between animate-in slide-in-from-right">
                   <div className="flex items-center text-red-500 font-bold gap-2 animate-pulse"><Video className="w-5 h-5"/> {formatTime(recordingTime)}</div>
                   <div className="flex items-center gap-4">
                     <button type="button" onClick={cancelRecording} className="text-[#708499] hover:text-white">Bekor</button>
                     <button onClick={() => stopRecordingAndSend('round_video')} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg"><Send className="w-5 h-5 ml-1"/></button>
                   </div>
                </div>
              )}

              <form onSubmit={(event) => { void handleSendMessage(event, "text"); }} className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} aria-label="Fayl biriktirish" className="rounded-full p-2 text-[#708499] transition-colors hover:text-white disabled:opacity-40"><Paperclip className="h-6 w-6" /></button>
                <input type="text" value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder={isUploading ? "Fayl yuklanmoqda..." : "Xabar yozing..."} disabled={isUploading} className={`min-w-0 flex-1 rounded-full bg-[#0e1621] px-5 py-3 text-white outline-none placeholder:text-[#708499] ${textSizeClass}`} onKeyDown={(event) => { if (event.key === "Enter" && appSettings.enterToSend) { event.preventDefault(); void handleSendMessage(undefined, "text"); } }} />
                {messageInput.trim() ? (
                  <button type="submit" disabled={isSendingMessage || isUploading} aria-label="Xabar yuborish" className="rounded-full bg-blue-600 p-3 text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"><Send className="ml-1 h-5 w-5" /></button>
                ) : (
                  <div className="flex gap-1">
                    <button type="button" disabled={isUploading} onClick={() => void startRecording("voice")} aria-label="Ovozli xabar yozish" className="rounded-full p-3 text-[#708499] transition-colors hover:text-white disabled:opacity-40"><Mic className="h-6 w-6" /></button>
                    <button type="button" disabled={isUploading} onClick={() => void startRecording("round_video")} aria-label="Video xabar yozish" className="rounded-full p-3 text-[#708499] transition-colors hover:text-white disabled:opacity-40"><Camera className="h-6 w-6" /></button>
                  </div>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#708499] bg-[#0e1621]">
            <div className="w-20 h-20 bg-[#17212b] rounded-full flex items-center justify-center mb-4"><MessageCircle className="w-10 h-10"/></div>
            <p className="font-bold text-lg">Yozishish uchun chatni tanlang</p>
          </div>
        )}
      </div>

      {showFolderModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-2xl p-6 border border-[#0e1621] max-h-[80vh] flex flex-col">
             <h3 className="font-bold text-xl mb-6 text-white flex items-center"><FolderPlus className="w-5 h-5 mr-2 text-blue-500"/> Yangi Papka</h3>
             <input type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Papka nomi (Masalan: O'qituvchilar)" className="w-full bg-[#0e1621] rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-4" />
             
             <p className="text-sm font-bold text-[#708499] mb-2">Chatlarni tanlang:</p>
             <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2 scrollbar-thin">
                {chats.map(chat => (
                  <div key={chat.id} onClick={() => toggleChatSelectionForFolder(chat.id)} className="flex items-center gap-3 p-2 bg-[#0e1621] rounded-xl cursor-pointer hover:bg-[#202b36] border border-transparent">
                    <button className={`w-5 h-5 rounded flex items-center justify-center border ${selectedChatsForFolder.includes(chat.id) ? 'bg-blue-500 border-blue-500' : 'border-[#708499]'}`}>
                      {selectedChatsForFolder.includes(chat.id) && <Check className="w-4 h-4 text-white"/>}
                    </button>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {chat.avatar_url ? <img src={chat.avatar_url} alt="" className="w-full h-full object-cover"/> : chat.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-white truncate">{chat.name}</span>
                  </div>
                ))}
             </div>

             <div className="flex gap-3 mt-auto">
               <button onClick={() => {setShowFolderModal(false); setNewFolderName(""); setSelectedChatsForFolder([]);}} className="flex-1 py-3.5 text-[#708499] font-bold hover:bg-[#202b36] rounded-xl">Bekor qilish</button>
               <button onClick={handleCreateFolder} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Saqlash</button>
             </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 h-[85vh] flex flex-col border border-[#0e1621]">
             <div className="h-[60px] px-4 flex items-center justify-between border-b border-[#0e1621] bg-[#17212b]">
               <div className="flex items-center gap-4">
                 {settingsView !== "main" && <button onClick={() => setSettingsView("main")} className="text-[#708499] hover:text-white"><ArrowLeft className="w-5 h-5"/></button>}
                 <h3 className="font-bold text-[17px] text-white">
                   {settingsView === "main" ? "Settings" : settingsView === "account" ? "My Account" : settingsView === "chat" ? "Chat Settings" : settingsView === "notif" ? "Notifications" : settingsView === "privacy" ? "Privacy" : "Language"}
                 </h3>
               </div>
               <button onClick={() => setShowSettingsModal(false)} className="text-[#708499] hover:text-white"><X className="w-5 h-5"/></button>
             </div>

             <div className="flex-1 overflow-y-auto scrollbar-thin bg-[#0e1621]">
                {settingsView === "main" && (
                  <div>
                    <div className="p-4 bg-[#182533] border-b border-[#0e1621]">
                      <p className="text-[#4a8ebf] font-bold text-[15px] mb-2">Is ID: {student.id} still active?</p>
                      <p className="text-[13px] text-[#708499] leading-snug mb-4">Keep your account secure. <span className="text-[#4a8ebf] cursor-pointer hover:underline">Learn More</span></p>
                      <div className="flex gap-3">
                        <button className="flex-1 bg-[#2b5278] hover:bg-[#3d7ca8] text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Yes</button>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <div onClick={() => setSettingsView("account")} className="flex items-center gap-5 px-5 py-3.5 hover:bg-[#202b36] cursor-pointer text-[#708499] hover:text-white"><User className="w-6 h-6" /> <span className="font-medium text-[15px] text-gray-200">My Account</span></div>
                      <div onClick={() => setSettingsView("notif")} className="flex items-center gap-5 px-5 py-3.5 hover:bg-[#202b36] cursor-pointer text-[#708499] hover:text-white"><Bell className="w-6 h-6" /> <span className="font-medium text-[15px] text-gray-200">Notifications and Sounds</span></div>
                      <div onClick={() => setSettingsView("privacy")} className="flex items-center gap-5 px-5 py-3.5 hover:bg-[#202b36] cursor-pointer text-[#708499] hover:text-white"><Lock className="w-6 h-6" /> <span className="font-medium text-[15px] text-gray-200">Privacy and Security</span></div>
                      <div onClick={() => setSettingsView("chat")} className="flex items-center gap-5 px-5 py-3.5 hover:bg-[#202b36] cursor-pointer text-[#708499] hover:text-white"><MessageCircle className="w-6 h-6" /> <span className="font-medium text-[15px] text-gray-200">Chat Settings</span></div>
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-[#202b36] cursor-pointer text-[#708499] hover:text-white" onClick={() => setSettingsView("language")}>
                        <div className="flex items-center gap-5"><Languages className="w-6 h-6" /> <span className="font-medium text-[15px] text-gray-200">Language</span></div>
                        <span className="text-sm text-[#4a8ebf]">{appSettings.language}</span>
                      </div>
                    </div>
                  </div>
                )}

                {settingsView === "account" && (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-center mb-6">
                      <label className="relative group cursor-pointer">
                        <div className="w-28 h-28 rounded-full bg-[#17212b] border border-[#2b5278] flex items-center justify-center overflow-hidden">
                          {uploadImage && uploadPreview ? <img src={uploadPreview} alt="Tanlangan profil rasmi" className="w-full h-full object-cover"/> : student.avatar_url ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-blue-500"/>}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadImage(e.target.files[0]); }}/>
                      </label>
                    </div>
                    <div><label className="text-[11px] font-bold text-[#708499] uppercase ml-1">Ism Sharifingiz</label><input type="text" value={profileName} onChange={e=>setProfileName(e.target.value)} className="w-full bg-[#17212b] rounded-xl p-3 text-white border-transparent focus:border-blue-500 outline-none mt-1" /></div>
                    <div><label className="text-[11px] font-bold text-[#708499] uppercase ml-1">Foydalanuvchi nomi</label><input type="text" value={profileUsername} onChange={e=>setProfileUsername(e.target.value)} placeholder="@username" className="w-full bg-[#17212b] rounded-xl p-3 text-white border-transparent focus:border-blue-500 outline-none mt-1" /></div>
                    <button onClick={handleUpdateProfile} disabled={isUploading} className="w-full py-3.5 bg-[#2b5278] text-white font-bold rounded-xl hover:bg-blue-600 mt-4 disabled:opacity-50">{isUploading ? "Saqlanmoqda..." : "Saqlash"}</button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {showAddContactModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-2xl p-6 border border-[#0e1621]">
             <h3 className="font-bold text-xl mb-6 text-white flex items-center"><User className="w-5 h-5 mr-2 text-blue-500"/> Yangi Kontakt</h3>
             <input type="text" value={contactId} onChange={e=>setContactId(e.target.value)} placeholder="ID raqam (S-1122)" className="w-full bg-[#0e1621] rounded-xl p-4 text-white outline-none focus:border-blue-500 uppercase font-mono mb-3" />
             <input type="text" value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="Kontakt nomi..." className="w-full bg-[#0e1621] rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-6" />
             <div className="flex gap-3">
               <button onClick={() => setShowAddContactModal(false)} className="flex-1 py-3 text-[#708499] font-bold hover:bg-[#202b36] rounded-xl">Bekor</button>
               <button onClick={handleAddContact} disabled={isUploading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Qo'shish</button>
             </div>
          </div>
        </div>
      )}

      {(showCreateGroupModal || showCreateChannelModal) && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-2xl p-6 border border-[#0e1621]">
             <h3 className="font-bold text-xl mb-6 text-white">{showCreateGroupModal ? "Yangi Guruh" : "Yangi Kanal"}</h3>
             <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-full bg-[#0e1621] border border-[#2b5278] flex items-center justify-center overflow-hidden">
                    {uploadImage && uploadPreview ? <img src={uploadPreview} alt="Tanlangan profil rasmi" className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-blue-500"/>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadImage(e.target.files[0]); }}/>
                </label>
             </div>
             <input type="text" value={newChatName} onChange={e=>setNewChatName(e.target.value)} placeholder="Nomi..." className="w-full bg-[#0e1621] rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-4" />
             <div className="flex gap-3">
               <button onClick={() => {setShowCreateGroupModal(false); setShowCreateChannelModal(false); setUploadImage(null);}} className="flex-1 py-3 text-[#708499] font-bold hover:bg-[#202b36] rounded-xl">Bekor qilish</button>
               <button onClick={() => handleCreateGroupOrChannel(showCreateGroupModal ? 'group' : 'channel')} disabled={isUploading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Yaratish</button>
             </div>
          </div>
        </div>
      )}

      {showEditChatModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-2xl p-6 border border-[#0e1621]">
             <h3 className="font-bold text-xl mb-6 text-white">Tahrirlash</h3>
             <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-full bg-[#0e1621] border border-[#2b5278] flex items-center justify-center overflow-hidden">
                    {uploadImage && uploadPreview ? <img src={uploadPreview} alt="Tanlangan profil rasmi" className="w-full h-full object-cover"/> : activeChat.avatar_url ? <img src={activeChat.avatar_url} alt="" className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-blue-500"/>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadImage(e.target.files[0]); }}/>
                </label>
             </div>
             <input type="text" value={newChatName} onChange={e=>setNewChatName(e.target.value)} placeholder="Nomi..." className="w-full bg-[#0e1621] rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-4" />
             <div className="flex gap-3">
               <button onClick={() => {setShowEditChatModal(false); setUploadImage(null);}} className="flex-1 py-3 text-[#708499] font-bold hover:bg-[#202b36] rounded-xl">Bekor qilish</button>
               <button onClick={handleUpdateChat} disabled={isUploading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Saqlash</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
