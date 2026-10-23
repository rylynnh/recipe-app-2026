import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { enableAdminMode } from '../../lib/adminMode';
import { verifyAdminPin } from '../../lib/adminRecipeSync';
import { Modal } from '../Modal';

interface AdminPinDialogProps { open:boolean; onCancel:()=>void; onUnlocked:()=>void; }
export function AdminPinDialog({open,onCancel,onUnlocked}:AdminPinDialogProps) {
  const [pin,setPin]=useState('');
  const [error,setError]=useState('');
  const [checking,setChecking]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!open)return;setPin('');setError('');setChecking(false);const frame=requestAnimationFrame(()=>inputRef.current?.focus());return()=>cancelAnimationFrame(frame);},[open]);
  if(!open)return null;
  const unlock=async(event:FormEvent)=>{
    event.preventDefault();
    if(!pin.trim()){setError('请输入管理 PIN');return;}
    setChecking(true);setError('');
    try {
      const result=await verifyAdminPin(pin.trim());
      if(!result.ok){setError(result.error || '验证服务暂时不可用，请稍后重试。');return;}
      enableAdminMode(pin.trim());onUnlocked();
    } catch {setError('暂时无法验证，请稍后重试。');}
    finally {setChecking(false);}
  };
  return <Modal title="解锁管理模式" description="输入管理 PIN，继续收录或编辑菜谱。" onClose={onCancel} busy={checking}><form onSubmit={unlock}>
    <label className="mise-field-label" htmlFor="admin-pin-input">管理 PIN</label>
    <input id="admin-pin-input" ref={inputRef} type="password" autoComplete="current-password" value={pin} onChange={event=>{setPin(event.target.value);setError('');}} className="mise-field-input" aria-invalid={Boolean(error)} aria-describedby={error?'admin-pin-error':undefined} disabled={checking}/>
    {error && <p className="mise-field-error" role="alert" id="admin-pin-error">{error}</p>}
    <div className="mise-dialog-actions"><button type="button" className="mise-secondary-button" onClick={onCancel} disabled={checking}>取消</button><button type="submit" className="mise-primary-button" disabled={checking}>{checking?'验证中…':'解锁并继续'}</button></div>
  </form></Modal>;
}
