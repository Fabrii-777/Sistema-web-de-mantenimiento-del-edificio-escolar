(() => {
  const config = window.APP_CONFIG || {};
  const TABLE_NAME = config.TABLE_NAME || "avisos_mantenimiento";

  const isConfigured =
    Boolean(config.SUPABASE_URL) &&
    Boolean(config.SUPABASE_KEY) &&
    !config.SUPABASE_URL.includes("TU_SUPABASE_URL") &&
    !config.SUPABASE_KEY.includes("TU_SUPABASE");

  const supabaseClient =
    isConfigured && window.supabase
      ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY)
      : null;

  // Referencias del DOM
  const configWarning = document.getElementById("config-warning");
  const statusMessage = document.getElementById("status-message");
  const createForm = document.getElementById("create-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");

  const fechaInput = document.getElementById("fecha_aviso");
  const countTotal = document.getElementById("count-total");
  const countUrgente = document.getElementById("count-urgente");
  const countNormal = document.getElementById("count-normal");

  const filterButtons = document.querySelectorAll(".filter-btn");
  const filterSummary = document.getElementById("filter-summary");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const tableWrapper = document.getElementById("table-wrapper");
  const recordsTbody = document.getElementById("records-tbody");

  // Modal de edición
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const editIdInput = document.getElementById("edit-id");
  const editSectorInput = document.getElementById("edit-sector");
  const editPrioridadInput = document.getElementById("edit-prioridad");
  const editDesperfectoInput = document.getElementById("edit-desperfecto");
  const editFechaInput = document.getElementById("edit-fecha_aviso");
  const editResponsableInput = document.getElementById("edit-responsable");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const closeEditModalBtn = document.getElementById("close-edit-modal");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  // Modal de eliminación
  const deleteModal = document.getElementById("delete-modal");
  const deleteModalText = document.getElementById("delete-modal-text");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const closeDeleteModalBtn = document.getElementById("close-delete-modal");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  let currentFilter = "todas";
  let allRecords = [];
  let pendingDeleteId = null;
  let toastTimeout = null;

  function getTodayISO() {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  }

  function showStatus(message, type = "success") {
    clearTimeout(toastTimeout);
    statusMessage.textContent = message;
    statusMessage.className = `status-toast ${type}`;
    statusMessage.classList.remove("hidden");

    toastTimeout = setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 4500);
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function updateSummaryCounts(records) {
    const urgentes = records.filter((item) => item.prioridad === "urgente").length;
    const normales = records.filter((item) => item.prioridad === "normal").length;

    countTotal.textContent = String(records.length);
    countUrgente.textContent = String(urgentes);
    countNormal.textContent = String(normales);
  }

  function sortRecords(records) {
    return [...records].sort((a, b) => {
      // Mostrar primero los pedidos urgentes para facilitar la intervención
      if (a.prioridad !== b.prioridad) {
        return a.prioridad === "urgente" ? -1 : 1;
      }
      return String(b.fecha_aviso).localeCompare(String(a.fecha_aviso));
    });
  }

  function renderRecords(records) {
    recordsTbody.innerHTML = "";

    if (records.length === 0) {
      tableWrapper.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    tableWrapper.classList.remove("hidden");

    const sorted = sortRecords(records);

    sorted.forEach((record) => {
      const tr = document.createElement("tr");
      if (record.prioridad === "urgente") {
        tr.classList.add("row-urgent");
      }

      const tdPriority = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge badge-${record.prioridad}`;
      badge.textContent = record.prioridad === "urgente" ? "Urgente" : "Normal";
      tdPriority.appendChild(badge);

      const tdSector = document.createElement("td");
      tdSector.className = "sector-cell";
      tdSector.textContent = record.sector;

      const tdDesperfecto = document.createElement("td");
      tdDesperfecto.textContent = record.desperfecto;

      const tdFecha = document.createElement("td");
      tdFecha.textContent = formatDate(record.fecha_aviso);

      const tdResponsable = document.createElement("td");
      tdResponsable.textContent = record.responsable;

      const tdActions = document.createElement("td");
      const actionsBox = document.createElement("div");
      actionsBox.className = "row-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-secondary btn-sm";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => openEditModal(record));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-danger btn-sm";
      deleteBtn.textContent = "Eliminar";
      deleteBtn.addEventListener("click", () => openDeleteModal(record));

      actionsBox.append(editBtn, deleteBtn);
      tdActions.appendChild(actionsBox);

      tr.append(
        tdPriority,
        tdSector,
        tdDesperfecto,
        tdFecha,
        tdResponsable,
        tdActions
      );
      recordsTbody.appendChild(tr);
    });
  }

  function updateFilterSummary(filteredCount) {
    const labels = {
      todas: `Mostrando todos los registros (${filteredCount})`,
      urgente: `Mostrando solo pedidos urgentes (${filteredCount})`,
      normal: `Mostrando solo pedidos normales (${filteredCount})`,
    };
    filterSummary.textContent = labels[currentFilter] || labels.todas;
  }

  async function refreshCounts() {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("id, prioridad");

    if (!error && data) {
      updateSummaryCounts(data);
    }
  }

  async function loadRecords() {
    if (!supabaseClient) {
      configWarning.classList.remove("hidden");
      tableWrapper.classList.add("hidden");
      emptyState.classList.remove("hidden");
      emptyState.textContent = "Configurá Supabase en config.js para visualizar y administrar los registros.";
      return;
    }

    loadingState.classList.remove("hidden");
    tableWrapper.classList.add("hidden");
    emptyState.classList.add("hidden");

    let query = supabaseClient
      .from(TABLE_NAME)
      .select("id, sector, desperfecto, prioridad, fecha_aviso, responsable, created_at")
      .order("fecha_aviso", { ascending: false })
      .order("id", { ascending: false });

    if (currentFilter !== "todas") {
      query = query.eq("prioridad", currentFilter);
    }

    const { data, error } = await query;
    loadingState.classList.add("hidden");

    if (error) {
      console.error("Error al consultar Supabase:", error);
      showStatus(`No se pudieron cargar los avisos: ${error.message}`, "error");
      emptyState.classList.remove("hidden");
      return;
    }

    allRecords = data || [];
    renderRecords(allRecords);
    updateFilterSummary(allRecords.length);

    if (currentFilter === "todas") {
      updateSummaryCounts(allRecords);
    } else {
      await refreshCounts();
    }
  }

  function validateFields({ sector, desperfecto, prioridad, fecha_aviso, responsable }) {
    if (!sector.trim() || !desperfecto.trim() || !fecha_aviso || !responsable.trim()) {
      return "Completá todos los campos obligatorios antes de guardar.";
    }
    if (!["normal", "urgente"].includes(prioridad)) {
      return "Seleccioná una prioridad válida (Normal o Urgente).";
    }
    return null;
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
      showStatus("Configurá primero las credenciales de Supabase en config.js.", "error");
      return;
    }

    const payload = {
      sector: document.getElementById("sector").value.trim(),
      desperfecto: document.getElementById("desperfecto").value.trim(),
      prioridad: document.getElementById("prioridad").value,
      fecha_aviso: fechaInput.value,
      responsable: document.getElementById("responsable").value.trim(),
    };

    const validationError = validateFields(payload);
    if (validationError) {
      showStatus(validationError, "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    const { error } = await supabaseClient.from(TABLE_NAME).insert([payload]).select();

    submitBtn.disabled = false;
    submitBtn.textContent = "Guardar aviso";

    if (error) {
      console.error("Error al insertar en Supabase:", error);
      showStatus(`Error al registrar el aviso: ${error.message}`, "error");
      return;
    }

    createForm.reset();
    fechaInput.value = getTodayISO();
    showStatus("Aviso registrado correctamente en Supabase.", "success");
    await loadRecords();
  }

  function openEditModal(record) {
    editIdInput.value = record.id;
    editSectorInput.value = record.sector;
    editPrioridadInput.value = record.prioridad;
    editDesperfectoInput.value = record.desperfecto;
    editFechaInput.value = record.fecha_aviso;
    editResponsableInput.value = record.responsable;
    editModal.classList.remove("hidden");
    editSectorInput.focus();
  }

  function closeEditModal() {
    editModal.classList.add("hidden");
    editForm.reset();
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const id = Number(editIdInput.value);
    const updates = {
      sector: editSectorInput.value.trim(),
      desperfecto: editDesperfectoInput.value.trim(),
      prioridad: editPrioridadInput.value,
      fecha_aviso: editFechaInput.value,
      responsable: editResponsableInput.value.trim(),
    };

    const validationError = validateFields(updates);
    if (validationError) {
      showStatus(validationError, "error");
      return;
    }

    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Guardando...";

    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .select();

    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Guardar cambios";

    if (error) {
      console.error("Error al actualizar en Supabase:", error);
      showStatus(`Error al modificar el aviso: ${error.message}`, "error");
      return;
    }

    if (!data || data.length === 0) {
      showStatus("No se encontró el registro para actualizar.", "error");
      return;
    }

    closeEditModal();
    showStatus("Aviso actualizado correctamente.", "success");
    await loadRecords();
  }

  function openDeleteModal(record) {
    pendingDeleteId = record.id;
    deleteModalText.textContent = `¿Estás seguro de eliminar el aviso del sector "${record.sector}"? Esta acción no se puede deshacer.`;
    deleteModal.classList.remove("hidden");
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
  }

  async function handleConfirmDelete() {
    if (!supabaseClient || pendingDeleteId === null) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Eliminando...";

    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .delete()
      .eq("id", pendingDeleteId);

    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Sí, eliminar";

    if (error) {
      console.error("Error al eliminar en Supabase:", error);
      showStatus(`Error al eliminar el aviso: ${error.message}`, "error");
      return;
    }

    closeDeleteModal();
    showStatus("Aviso eliminado correctamente.", "success");
    await loadRecords();
  }

  // Eventos
  fechaInput.value = getTodayISO();

  createForm.addEventListener("submit", handleCreateSubmit);
  resetBtn.addEventListener("click", () => {
    setTimeout(() => {
      fechaInput.value = getTodayISO();
    }, 0);
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const selected = btn.dataset.filter;
      if (selected === currentFilter) return;

      currentFilter = selected;
      filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
      await loadRecords();
    });
  });

  editForm.addEventListener("submit", handleEditSubmit);
  closeEditModalBtn.addEventListener("click", closeEditModal);
  cancelEditBtn.addEventListener("click", closeEditModal);

  confirmDeleteBtn.addEventListener("click", handleConfirmDelete);
  closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeEditModal();
      closeDeleteModal();
    }
  });

  loadRecords();
})();
