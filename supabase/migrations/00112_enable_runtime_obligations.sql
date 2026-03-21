update feature_flags
set
  default_enabled = true,
  description = 'Obligation tracking: durable state and user-visible progress/follow-up enforcement for Discord runtime tasks'
where flag_key = 'runtime_obligations_enabled';
