using UnityEngine;

public class CameraController : MonoBehaviour
{
    [Header("Target Settings")]
    [SerializeField] private Transform target;
    [SerializeField] private float smoothSpeed = 5f;
    
    [Header("Camera Settings")]
    [SerializeField] private Vector3 offset = new Vector3(0f, 5f, -10f);
    [SerializeField] private float rotationSpeed = 2f;
    [SerializeField] private float minY = 2f;
    [SerializeField] private float maxY = 10f;
    
    [Header("Mouse Control")]
    [SerializeField] private float mouseSensitivity = 2f;
    [SerializeField] private bool invertY = true;
    
    private float currentRotationX;
    private float currentRotationY;
    
    private void Start()
    {
        if (target == null)
        {
            target = GameObject.FindGameObjectWithTag("Player").transform;
            if (target == null)
            {
                Debug.LogError("No target found for camera to follow!");
                enabled = false;
                return;
            }
        }
        
        // Initialize camera rotation
        Vector3 angles = transform.eulerAngles;
        currentRotationX = angles.y;
        currentRotationY = angles.x;
    }
    
    private void LateUpdate()
    {
        if (target == null) return;
        
        // Handle mouse input for camera rotation
        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity * (invertY ? 1f : -1f);
        
        currentRotationX += mouseX;
        currentRotationY = Mathf.Clamp(currentRotationY + mouseY, -80f, 80f);
        
        // Calculate camera position and rotation
        Quaternion rotation = Quaternion.Euler(currentRotationY, currentRotationX, 0f);
        Vector3 targetPosition = target.position + rotation * offset;
        
        // Ensure camera doesn't go below minimum Y
        targetPosition.y = Mathf.Max(targetPosition.y, minY);
        
        // Smoothly move camera
        transform.position = Vector3.Lerp(transform.position, targetPosition, smoothSpeed * Time.deltaTime);
        
        // Look at target
        Vector3 targetLookPosition = target.position + Vector3.up * 1f; // Look slightly above the target
        transform.LookAt(targetLookPosition);
    }
    
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
} 