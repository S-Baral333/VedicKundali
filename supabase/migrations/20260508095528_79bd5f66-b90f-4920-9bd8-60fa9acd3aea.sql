create or replace function public.publish_prompt_layer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_key text;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden';
  end if;
  select layer_key into v_key from public.ai_prompt_layers where id = p_id;
  if v_key is null then
    raise exception 'layer not found';
  end if;
  update public.ai_prompt_layers
    set status = 'archived', updated_at = now()
    where layer_key = v_key and status = 'published' and id <> p_id;
  update public.ai_prompt_layers
    set status = 'published', updated_at = now()
    where id = p_id;
end;
$$;

revoke all on function public.publish_prompt_layer(uuid) from public;
grant execute on function public.publish_prompt_layer(uuid) to authenticated;